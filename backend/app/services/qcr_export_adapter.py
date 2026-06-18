"""
Map QCR editing workspace clauses (Layer 5) → cofounder merged-policy export shape.

Field names only — no change to merger or row-builder logic in app.ai.
"""

from __future__ import annotations

import re
from typing import Any

_UI_TO_REMARK_STATUS: dict[str, str] = {
    "agreed": "AGREED",
    "partially_agreed": "PARTIALLY_AGREED",
    "not_agreed": "NOT_AGREED",
    "not_applicable": "NOT_APPLICABLE",
    "pending_review": "",
}

_REMARK_STATUS_LABEL_TO_ENUM: dict[str, str] = {
    "agreed": "AGREED",
    "partially agreed": "PARTIALLY_AGREED",
    "not agreed": "NOT_AGREED",
    "not applicable": "NOT_APPLICABLE",
    "pending": "",
    "pending review": "",
}


def ui_status_to_remark_status(status: str | None, override: str | None = None) -> str:
    effective = (override or status or "").strip()
    if not effective:
        return ""
    key = effective.lower().replace(" ", "_")
    if key in _UI_TO_REMARK_STATUS:
        return _UI_TO_REMARK_STATUS[key]
    return _REMARK_STATUS_LABEL_TO_ENUM.get(effective.lower(), effective.upper())


def _section_label(
    section_id: str,
    sections: list[dict[str, Any]],
) -> str:
    for section in sections:
        if section.get("id") == section_id:
            label = section.get("label")
            if isinstance(label, str) and label.strip():
                return label.strip()
    return section_id.replace("-", " ").title() or "Policy"


def clause_comparison_to_export_clause(
    clause: dict[str, Any],
    insurers_order: list[str],
) -> dict[str, Any]:
    source = clause.get("source") or {}
    excel_row = source.get("excel_row") if isinstance(source, dict) else None

    by_insurer: dict[str, dict[str, Any]] = {}
    for comparison in clause.get("comparisons") or []:
        if not isinstance(comparison, dict):
            continue
        name = str(comparison.get("insurer") or "").strip()
        if name:
            by_insurer[name] = comparison

    insurers: list[dict[str, Any]] = []
    for company in insurers_order:
        comparison = by_insurer.get(company)
        if comparison:
            insurers.append(
                {
                    "company": company,
                    "uw_remark": str(comparison.get("proposal_clause") or ""),
                    "remark_status": ui_status_to_remark_status(
                        comparison.get("status"),
                        comparison.get("override_status"),
                    ),
                    "source": source if isinstance(source, dict) else {},
                }
            )
        else:
            insurers.append(
                {
                    "company": company,
                    "uw_remark": "",
                    "remark_status": "",
                    "source": source if isinstance(source, dict) else {},
                }
            )

    return {
        "excel_row": excel_row if excel_row is not None else "",
        "clause": str(clause.get("rfq_clause") or ""),
        "requirement": str(clause.get("rfq_requirement") or ""),
        "insurers": insurers,
    }


def clauses_to_merged_policies(
    clauses: list[dict[str, Any]],
    sections: list[dict[str, Any]],
    insurers: list[str],
) -> list[dict[str, Any]]:
    """
    Group editing clauses by section_id → one merged-policy dict per policy section.
    """
    insurers_order = [i.strip() for i in insurers if i and str(i).strip()]
    if not insurers_order:
        seen: set[str] = set()
        for clause in clauses:
            for comparison in clause.get("comparisons") or []:
                if isinstance(comparison, dict):
                    name = str(comparison.get("insurer") or "").strip()
                    if name:
                        seen.add(name)
        insurers_order = sorted(seen)

    by_section: dict[str, list[dict[str, Any]]] = {}
    section_order: list[str] = []

    for clause in clauses:
        section_id = str(clause.get("section_id") or "policy")
        if section_id not in by_section:
            by_section[section_id] = []
            section_order.append(section_id)
        export_clause = clause_comparison_to_export_clause(clause, insurers_order)
        by_section[section_id].append(export_clause)

    merged_policies: list[dict[str, Any]] = []
    for section_id in section_order:
        export_clauses = by_section.get(section_id, [])
        if not export_clauses:
            continue
        merged_policies.append(
            {
                "policy": _section_label(section_id, sections),
                "clauses": export_clauses,
            }
        )

    return merged_policies


_INVALID_SHEET_CHARS = re.compile(r"[\[\]:*?/\\]")


def sanitize_sheet_name(name: str, used: set[str]) -> str:
    cleaned = _INVALID_SHEET_CHARS.sub(" ", name).strip() or "Policy"
    base = cleaned[:31]
    candidate = base
    suffix = 2
    while candidate in used:
        tail = f" ({suffix})"
        candidate = (base[: 31 - len(tail)] + tail).strip()
        suffix += 1
    used.add(candidate)
    return candidate
