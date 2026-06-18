"""
Run cofounder gap-analysis pipeline on server-stored quote files.

Orchestration extracted from model/backend/main.py (proposals branch).
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai.extraction.policy_block_extractor import extract_policy_block
from app.ai.gap_analysis.policy_merger import merge_policy_records
from app.ai.gap_analysis.process_policy import process_policy
from app.ai.llm.policy_clause_extractor import extract_policy_clauses
from app.models.project import Project
from app.schemas.workspace import (
    WORKSPACE_SCHEMA_VERSION,
    AIAnalysis,
    Clause,
    InsurerValue,
    PolicySection,
    SourceTrace,
    WorkspaceMetadata,
    WorkspacePayload,
    WorkspaceResponse,
)
from app.services import document_service

EXCEL_SUFFIXES = frozenset({".xlsx", ".xls"})

QCR_STATUS_PROCESSING = "processing"
QCR_STATUS_COMPLETED = "completed"
QCR_STATUS_FAILED = "failed"

REMARK_TO_RISK = {
    "AGREED": "low",
    "PARTIALLY_AGREED": "medium",
    "NOT_AGREED": "high",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "section"


def _clause_id(policy: str, excel_row: int, clause_text: str) -> str:
    base = _slug(clause_text)[:40] if clause_text else "clause"
    return f"{_slug(policy)}_{excel_row}_{base}"


def policy_config_from_payload(payload: WorkspacePayload) -> list[dict]:
    """Map workstation selected_sections → model policy_config (one entry per section + sheet)."""
    configs: list[dict] = []
    for section in payload.selected_sections:
        by_sheet: dict[str, list[tuple[int, int]]] = {}
        for mapping in section.source_mappings:
            loc = mapping.source_reference.location
            if not loc.sheet_name or not loc.row_start or not loc.row_end:
                continue
            by_sheet.setdefault(loc.sheet_name, []).append(
                (loc.row_start, loc.row_end)
            )
        for sheet_name, row_ranges in by_sheet.items():
            configs.append(
                {
                    "policy": section.section_name,
                    "sheet_name": sheet_name,
                    "start_row": min(r[0] for r in row_ranges),
                    "end_row": max(r[1] for r in row_ranges),
                }
            )
    return configs


def _excel_quote_documents(db: Session, project: Project):
    docs = document_service.list_documents_for_project(
        db, project, document_service.DOCUMENT_TYPE_QUOTE
    )
    excel_docs = [
        d
        for d in docs
        if Path(d.original_filename).suffix.lower() in EXCEL_SUFFIXES
        and Path(d.storage_path).is_file()
    ]
    return excel_docs


def _company_name_from_document(doc) -> str:
    return Path(doc.original_filename).stem


def _gap_analysis_output_dir(project: Project) -> Path:
    root = document_service.uploads_root()
    path = root / project.organization_id / project.id / "gap_analysis" / "latest"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _persist_artifacts(
    project: Project,
    per_insurer: dict[str, dict[str, dict]],
    merged_policies: list[dict],
) -> None:
    base = _gap_analysis_output_dir(project)
    policies_root = base / "policies"
    merged_root = base / "merged"
    policies_root.mkdir(parents=True, exist_ok=True)
    merged_root.mkdir(parents=True, exist_ok=True)

    for company, policies in per_insurer.items():
        company_dir = policies_root / company
        company_dir.mkdir(parents=True, exist_ok=True)
        for policy_name, data in policies.items():
            safe_name = re.sub(r'[<>:"/\\|?*]', "_", policy_name)
            out = company_dir / f"{safe_name}.json"
            out.write_text(
                json.dumps(data, indent=2, ensure_ascii=False, default=str),
                encoding="utf-8",
            )

    for merged in merged_policies:
        policy_name = merged.get("policy", "policy")
        safe_name = re.sub(r'[<>:"/\\|?*]', "_", policy_name)
        out = merged_root / f"{safe_name}.json"
        out.write_text(
            json.dumps(merged, indent=2, ensure_ascii=False, default=str),
            encoding="utf-8",
        )


def _pick_sheet_name(names: list[str], *candidates: str | None) -> str | None:
    """Resolve a workbook tab from one or more candidate names (exact, case, partial)."""
    if not names:
        return None

    by_lower = {name.lower(): name for name in names}

    for candidate in candidates:
        if not candidate or not str(candidate).strip():
            continue
        text = str(candidate).strip()
        if text in names:
            return text
        key = text.lower()
        if key in by_lower:
            return by_lower[key]
        for name in names:
            name_lower = name.lower()
            if key in name_lower or name_lower in key:
                return name

    if len(names) == 1:
        return names[0]

    return None


def resolve_quote_sheet_name(
    excel_path: str | Path,
    requested: str,
    *,
    policy_name: str | None = None,
) -> str:
    """
    Map RFQ sheet names from policy mappings onto quote workbook tabs.
    Falls back to policy section name, single-sheet workbooks, and fuzzy name match.
    """
    path = Path(excel_path)
    with pd.ExcelFile(path) as book:
        names = book.sheet_names

    if not names:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No worksheets found in quote file {path.name!r}.",
        )

    picked = _pick_sheet_name(names, requested, policy_name)
    if picked:
        return picked

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"Worksheet {requested!r} not found in quote file {path.name!r}. "
            f"Available sheets: {', '.join(names)}. "
            "Map policies on the correct RFQ tab, or use quote files whose tabs match "
            "your policy section names (e.g. Employee Benefits, Fire)."
        ),
    )


def run_gap_analysis(
    db: Session,
    project: Project,
    payload: WorkspacePayload,
) -> list[dict]:
    """
    Execute extraction + merge for all mapped policies across uploaded quote Excel files.
    Returns list of merged policy dicts (may be partial if merge fails mid-way).
    """
    policy_list = policy_config_from_payload(payload)
    if not policy_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid policy mappings with sheet and row ranges",
        )

    quote_docs = _excel_quote_documents(db, project)
    if not quote_docs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No quote Excel files on server. Upload quotes in the workstation "
                "before generating QCR with AI enabled."
            ),
        )

    per_insurer: dict[str, dict[str, dict]] = {}

    for doc in quote_docs:
        company_name = _company_name_from_document(doc)
        file_path = doc.storage_path
        per_insurer.setdefault(company_name, {})

        for policy_info in policy_list:
            policy_name = policy_info["policy"]
            sheet_name = policy_info["sheet_name"]
            start_row = policy_info["start_row"]
            end_row = policy_info["end_row"]

            resolved_sheet = resolve_quote_sheet_name(
                file_path,
                sheet_name,
                policy_name=policy_name,
            )

            policy_block = extract_policy_block(
                file_path,
                resolved_sheet,
                start_row,
                end_row,
            )

            structured = extract_policy_clauses(
                company_name,
                policy_name,
                resolved_sheet,
                start_row,
                end_row,
                policy_block,
            )

            if not isinstance(structured, dict) or not structured.get("clauses"):
                continue

            structured = process_policy(structured)
            per_insurer[company_name][policy_name] = structured

    merged_policies: list[dict] = []
    merge_errors: list[str] = []

    for policy_info in policy_list:
        policy_name = policy_info["policy"]
        policy_records: list[dict] = []
        for company, policies in per_insurer.items():
            record = policies.get(policy_name)
            if record:
                policy_records.append(record)

        if len(policy_records) < 2:
            continue

        try:
            merged = merge_policy_records(policy_records)
            if merged:
                merged_policies.append(merged)
        except IndexError as exc:
            merge_errors.append(
                f"{policy_name}: insurer clause counts differ ({exc})"
            )

    if not merged_policies and merge_errors:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Merge failed: " + "; ".join(merge_errors),
        )

    if merge_errors:
        # Partial success — persist what we have; caller may surface warnings in metadata.
        pass

    _persist_artifacts(project, per_insurer, merged_policies)
    return merged_policies


def workspace_response_from_merged(
    payload: WorkspacePayload,
    merged_policies: list[dict],
    *,
    workspace_id: str,
    merge_warnings: list[str] | None = None,
) -> WorkspaceResponse:
    """Map cofounder merged JSON → WorkspaceResponse (schema v1.0)."""
    now = utcnow()
    mapping_count = sum(len(s.source_mappings) for s in payload.selected_sections)

    meta = WorkspaceMetadata(
        project_name=payload.metadata.project_name if payload.metadata else None,
        client_name=payload.metadata.client_name if payload.metadata else None,
        generated_by="gap_analysis",
        mapping_count=mapping_count,
        document_count=len(payload.documents),
    )

    sections: list[PolicySection] = []
    for merged in merged_policies:
        policy_name = merged.get("policy", "Policy")
        section_id = _slug(policy_name)

        traces: list[SourceTrace] = []
        for selected in payload.selected_sections:
            if selected.section_name == policy_name:
                for mapping in selected.source_mappings:
                    loc = mapping.source_reference.location
                    traces.append(
                        SourceTrace(
                            document_id=mapping.document_id,
                            source_type=mapping.source_reference.source_type,
                            sheet_name=loc.sheet_name,
                            row_start=loc.row_start,
                            row_end=loc.row_end,
                        )
                    )

        clauses: list[Clause] = []
        for clause in merged.get("clauses", []):
            clause_text = clause.get("clause", "") or f"Row {clause.get('excel_row', '')}"
            requirement = clause.get("requirement", "")
            insurers = clause.get("insurers", [])
            values = [
                InsurerValue(
                    insurer=ins.get("company", "Unknown"),
                    value=ins.get("uw_remark", "") or "—",
                )
                for ins in insurers
            ]
            if not values:
                continue

            statuses = [ins.get("remark_status", "PARTIALLY_AGREED") for ins in insurers]
            dominant = statuses[0] if statuses else "PARTIALLY_AGREED"
            risk = REMARK_TO_RISK.get(dominant, "medium")

            clauses.append(
                Clause(
                    clause_id=_clause_id(policy_name, clause.get("excel_row", 0), clause_text),
                    title=clause_text,
                    category="general",
                    comparison_type="text",
                    editable=True,
                    values=values,
                    ai_analysis=AIAnalysis(
                        summary=(
                            f"Requirement: {requirement or '—'}. "
                            f"Insurer alignment: {', '.join(set(statuses))}."
                        ),
                        risk_level=risk,  # type: ignore[arg-type]
                        recommendation=(
                            "Review clauses marked NOT_AGREED or PARTIALLY_AGREED before binding."
                            if risk != "low"
                            else "Terms appear aligned across insurers for this clause."
                        ),
                        confidence=0.75,
                    ),
                    comments=[],
                )
            )

        sections.append(
            PolicySection(
                section_id=section_id,
                section_name=policy_name,
                source_trace=traces,
                clauses=clauses,
            )
        )

    if merge_warnings:
        # Attach warnings into first section's first clause analysis if present
        if sections and sections[0].clauses:
            c0 = sections[0].clauses[0]
            c0.ai_analysis.summary += " Warnings: " + "; ".join(merge_warnings)

    return WorkspaceResponse(
        workspace_id=workspace_id,
        project_id=payload.project_id,
        schema_version=WORKSPACE_SCHEMA_VERSION,
        generated_at=now,
        metadata=meta,
        sections=sections,
    )


def workspace_id_for_project(project_id: str) -> str:
    import hashlib

    digest = hashlib.sha256(f"wrk:{project_id}".encode()).hexdigest()[:12]
    return f"wrk_{digest}"
