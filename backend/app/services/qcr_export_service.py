"""Export QCR editing workspace to multi-sheet Excel (one sheet per policy)."""

from __future__ import annotations

from io import BytesIO
from typing import Any

import pandas as pd

from app.ai.gap_analysis.policy_merger import build_export_rows
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
    Build one .xlsx with one sheet per policy section.
    Column layout matches cofounder json_to_excel; broker edits flow into insurer Remark columns.
    """
    merged_policies = clauses_to_merged_policies(clauses, sections, insurers)
    if not merged_policies:
        raise ValueError("No clauses available to export")

    buffer = BytesIO()
    used_sheet_names: set[str] = set()

    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        for policy_data in merged_policies:
            sheet_name = sanitize_sheet_name(
                str(policy_data.get("policy") or "Policy"),
                used_sheet_names,
            )
            export_clauses = policy_data.get("clauses") or []
            rows = build_export_rows(
                {
                    "policy": policy_data.get("policy"),
                    "clauses": export_clauses,
                }
            )

            frame = pd.DataFrame(rows)
            if frame.empty:
                frame = pd.DataFrame(
                    columns=["Excel Row", "Clause", "Requirement"]
                )
            frame.to_excel(writer, sheet_name=sheet_name, index=False)

    buffer.seek(0)
    return buffer.getvalue()
