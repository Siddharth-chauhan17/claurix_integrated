"""
Map cofounder merged gap-analysis JSON → QCR editing raw clause contract (v2.0).

Frontend normalizes via lib/qcr-editing/normalize-ai-response.ts.
"""

from __future__ import annotations

import re
from typing import Any

REMARK_STATUS_UI: dict[str, tuple[str, float]] = {
    "AGREED": ("Agreed", 0.05),
    "PARTIALLY_AGREED": ("Partially Agreed", 0.35),
    "NOT_AGREED": ("Not Agreed", 0.75),
}


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "policy"


def _map_source(
    source: dict[str, Any] | None,
    *,
    rfq_file_name: str | None,
) -> dict[str, Any] | None:
    if not source:
        return None
    return {
        "file_name": rfq_file_name,
        "sheet_name": source.get("sheet_name", ""),
        "excel_row": int(source.get("excel_row") or 0),
        "clause_cell": source.get("clause_cell", ""),
        "requirement_cell": source.get("requirement_cell", ""),
        "uw_remark_cell": source.get("uw_remark_cell", ""),
    }


def _differences(
    remark_status: str,
    requirement: str,
    uw_remark: str,
) -> list[str]:
    if remark_status == "AGREED":
        return []
    if requirement and uw_remark:
        return [f"RFQ: {requirement}", f"Proposal: {uw_remark}"]
    if remark_status == "NOT_AGREED":
        return ["Insurer did not agree to RFQ requirement"]
    return ["Partial alignment with RFQ requirement"]


def merged_results_to_editing_payload(
    merged_policies: list[dict[str, Any]],
    *,
    rfq_file_name: str | None = None,
) -> dict[str, Any]:
    """
    Convert merged policy list to API payload for QCR editing workspace.

    Returns dict with keys: clauses, insurers, sections (policy-based).
    """
    clauses: list[dict[str, Any]] = []
    insurers: set[str] = set()
    sections: list[dict[str, str]] = []
    seen_sections: set[str] = set()

    for merged in merged_policies:
        policy_name = str(merged.get("policy") or "Policy")
        section_id = _slug(policy_name)
        if section_id not in seen_sections:
            seen_sections.add(section_id)
            sections.append({"id": section_id, "label": policy_name})

        for clause in merged.get("clauses") or []:
            comparisons: list[dict[str, Any]] = []
            source: dict[str, Any] | None = None
            requirement = str(clause.get("requirement") or "")

            for ins in clause.get("insurers") or []:
                company = str(ins.get("company") or "Unknown")
                insurers.add(company)
                remark_status = str(
                    ins.get("remark_status") or "PARTIALLY_AGREED"
                ).upper()
                status_label, gap_score = REMARK_STATUS_UI.get(
                    remark_status,
                    ("Partially Agreed", 0.35),
                )
                uw_remark = str(ins.get("uw_remark") or "")
                comparisons.append(
                    {
                        "insurer": company,
                        "proposal_clause": uw_remark,
                        "status": status_label,
                        "gap_score": gap_score,
                        "differences": _differences(
                            remark_status, requirement, uw_remark
                        ),
                    }
                )
                if source is None:
                    source = _map_source(
                        ins.get("source"),
                        rfq_file_name=rfq_file_name,
                    )

            if not comparisons:
                continue

            clauses.append(
                {
                    "policy_name": policy_name,
                    "rfq_clause": str(clause.get("clause") or ""),
                    "rfq_requirement": requirement,
                    "comparisons": comparisons,
                    "source": source,
                }
            )

    return {
        "clauses": clauses,
        "insurers": sorted(insurers),
        "sections": sections,
    }
