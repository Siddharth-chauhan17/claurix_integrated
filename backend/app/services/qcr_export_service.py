"""Export QCR editing workspace to styled multi-sheet Excel workbooks."""

from __future__ import annotations

from typing import Any

from app.ai.gap_analysis.policy_merger import merged_policies_to_excel_bytes
from app.services.qcr_export_adapter import (
    clauses_to_merged_policies,
    sanitize_sheet_name,
)


def export_qcr_workbook(
    *,
    clauses: list[dict[str, Any]],
    sections: list[dict[str, Any]],
    insurers: list[str],
) -> bytes:
    """
    Build one .xlsx with Summary + Comparison sheets per policy section.
    Broker edits flow into insurer UW Remark columns; statuses are color-coded.
    """
    merged_policies = clauses_to_merged_policies(clauses, sections, insurers)
    if not merged_policies:
        raise ValueError("No clauses available to export")

    return merged_policies_to_excel_bytes(
        merged_policies,
        sanitize_sheet_name=sanitize_sheet_name,
    )
