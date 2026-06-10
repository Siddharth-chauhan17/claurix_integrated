"""
Mock QCR orchestration — same contract shape as future cofounder_ai_service.

Swap this module for real AI without changing routes, schemas, or frontend types.
Outputs are deterministic from project_id + section mappings for stable dev/testing.

Real pipeline modules live under app.ai (extraction, llm, gap_analysis).
Enabled when Settings.ai_enabled is True (Phase 2+ wiring).
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

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

# Simulated market panel — not UI-specific; mirrors typical Indian commercial placements.
DEFAULT_INSURERS = (
    "ICICI Lombard",
    "TATA AIG",
    "HDFC ERGO",
    "Bajaj Allianz",
)

CLAUSE_TEMPLATES: tuple[tuple[str, str, str, str], ...] = (
    ("deductible", "Deductible", "deductible", "numeric"),
    ("sum_insured", "Sum Insured", "financial", "numeric"),
    ("premium", "Annual Premium", "financial", "numeric"),
    ("waiting_period", "Waiting Period", "coverage", "text"),
    ("terrorism", "Terrorism Cover", "coverage", "boolean"),
    ("flood_exclusion", "Flood Exclusion", "exclusion", "text"),
)

RISK_LEVELS: tuple[str, ...] = ("low", "medium", "high")
DEDUCTIBLE_AMOUNTS = ("₹2,50,000", "₹5,00,000", "₹7,50,000", "₹10,00,000")
SUM_INSURED_AMOUNTS = ("₹5 Cr", "₹10 Cr", "₹25 Cr", "₹50 Cr")
PREMIUM_AMOUNTS = ("₹1,20,000", "₹1,45,000", "₹1,68,000", "₹1,92,000")


def _seed(*parts: str) -> int:
    raw = "|".join(parts).encode("utf-8")
    return int(hashlib.sha256(raw).hexdigest()[:8], 16)


def _workspace_id(project_id: str) -> str:
    digest = hashlib.sha256(f"wrk:{project_id}".encode()).hexdigest()[:12]
    return f"wrk_{digest}"


def _pick(options: tuple[str, ...], seed: int, offset: int = 0) -> str:
    return options[(seed + offset) % len(options)]


def _risk_from_seed(seed: int) -> str:
    return RISK_LEVELS[seed % len(RISK_LEVELS)]


def _build_source_trace(payload: WorkspacePayload, section_id: str) -> list[SourceTrace]:
    traces: list[SourceTrace] = []
    for section in payload.selected_sections:
        if section.section_id != section_id:
            continue
        for mapping in section.source_mappings:
            loc = mapping.source_reference.location
            traces.append(
                SourceTrace(
                    document_id=mapping.document_id,
                    source_type=mapping.source_reference.source_type,
                    sheet_name=loc.sheet_name,
                    row_start=loc.row_start,
                    row_end=loc.row_end,
                    page_start=loc.page_start,
                    page_end=loc.page_end,
                )
            )
    return traces


def _clause_values(
    clause_id: str,
    project_id: str,
    section_id: str,
    insurer_count: int,
) -> list[InsurerValue]:
    base = _seed(project_id, section_id, clause_id)
    values: list[InsurerValue] = []
    for i in range(min(insurer_count, len(DEFAULT_INSURERS))):
        insurer = DEFAULT_INSURERS[i]
        offset = base + i
        if clause_id == "deductible":
            text = _pick(DEDUCTIBLE_AMOUNTS, offset)
        elif clause_id == "sum_insured":
            text = _pick(SUM_INSURED_AMOUNTS, offset, 1)
        elif clause_id == "premium":
            text = _pick(PREMIUM_AMOUNTS, offset, 2)
        elif clause_id == "waiting_period":
            text = _pick(("30 days", "60 days", "90 days", "None"), offset)
        elif clause_id == "terrorism":
            text = "Included" if offset % 2 == 0 else "Excluded"
        else:
            text = _pick(("Standard", "Restricted", "Broad", "As per RFQ"), offset)
        values.append(InsurerValue(insurer=insurer, value=text))
    return values


def _ai_analysis(
    clause_id: str,
    section_name: str,
    project_id: str,
    section_id: str,
) -> AIAnalysis:
    seed = _seed(project_id, section_id, clause_id, "analysis")
    risk = _risk_from_seed(seed)
    lead = DEFAULT_INSURERS[seed % len(DEFAULT_INSURERS)]
    trail = DEFAULT_INSURERS[(seed + 1) % len(DEFAULT_INSURERS)]
    return AIAnalysis(
        summary=(
            f"{section_name}: {lead} and {trail} diverge on {clause_id.replace('_', ' ')}. "
            f"Review against mapped RFQ rows before binding."
        ),
        risk_level=risk,  # type: ignore[arg-type]
        recommendation=(
            "Align terms with RFQ baseline and document any carve-outs in the comparison memo."
            if risk != "low"
            else "Terms are broadly aligned; confirm sub-limits at placement."
        ),
        confidence=round(0.72 + (seed % 20) / 100, 2),
    )


def _clauses_for_section(
    payload: WorkspacePayload,
    section_id: str,
    section_name: str,
) -> list[Clause]:
    insurer_count = max(2, min(len(DEFAULT_INSURERS), len(payload.documents) + 1))
    clauses: list[Clause] = []
    for clause_id, title, category, comparison_type in CLAUSE_TEMPLATES:
        clauses.append(
            Clause(
                clause_id=clause_id,
                title=title,
                category=category,  # type: ignore[arg-type]
                comparison_type=comparison_type,  # type: ignore[arg-type]
                editable=True,
                values=_clause_values(clause_id, payload.project_id, section_id, insurer_count),
                ai_analysis=_ai_analysis(clause_id, section_name, payload.project_id, section_id),
                comments=[],
            )
        )
    return clauses


def generate_workspace(payload: WorkspacePayload) -> WorkspaceResponse:
    """
    Produce semantic workspace JSON from user mappings.
    Real AI will accept the same WorkspacePayload and return WorkspaceResponse.
    """
    now = datetime.now(timezone.utc)
    mapping_count = sum(len(s.source_mappings) for s in payload.selected_sections)
    meta = WorkspaceMetadata(
        project_name=payload.metadata.project_name if payload.metadata else None,
        client_name=payload.metadata.client_name if payload.metadata else None,
        generated_by="mock",
        mapping_count=mapping_count,
        document_count=len(payload.documents),
    )

    sections: list[PolicySection] = []
    for selected in payload.selected_sections:
        sections.append(
            PolicySection(
                section_id=selected.section_id,
                section_name=selected.section_name,
                source_trace=_build_source_trace(payload, selected.section_id),
                clauses=_clauses_for_section(payload, selected.section_id, selected.section_name),
            )
        )

    return WorkspaceResponse(
        workspace_id=_workspace_id(payload.project_id),
        project_id=payload.project_id,
        schema_version=WORKSPACE_SCHEMA_VERSION,
        generated_at=now,
        metadata=meta,
        sections=sections,
    )
