"""
Merge per-insurer policy JSON and export merged policies to Excel rows.

Row alignment uses source.excel_row (not list index). Platform calls
merge_policy_records() with in-memory dicts; merge_policy_files() loads JSON paths.
"""

from __future__ import annotations

import json
from io import BytesIO
from typing import Any

import pandas as pd


def build_export_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Build flat row dicts for one merged policy (cofounder export column layout)."""
    rows: list[dict[str, Any]] = []

    for clause in data.get("clauses", []):
        row: dict[str, Any] = {
            "Excel Row": clause.get("excel_row", ""),
            "Clause": clause.get("clause", ""),
            "Requirement": clause.get("requirement", ""),
        }

        for insurer in clause.get("insurers", []):
            company = insurer.get("company", "Unknown Insurer")
            row[f"{company} Remark"] = insurer.get("uw_remark", "")
            row[f"{company} Status"] = insurer.get("remark_status", "")

        rows.append(row)

    return rows


def json_to_excel(json_file: str, excel_file: str) -> None:
    """CLI / script helper: read merged policy JSON from disk and write one sheet."""
    with open(json_file, "r", encoding="utf-8") as file:
        data = json.load(file)

    pd.DataFrame(build_export_rows(data)).to_excel(excel_file, index=False)
    print(f"[EXCEL EXPORTED] {excel_file}")


def merge_policy_records(policies: list[dict[str, Any]]) -> dict[str, Any]:
    """Merge in-memory per-insurer policy dicts (master = first policy)."""
    if not policies:
        return {}

    master_policy = policies[0]

    policy_maps: list[dict[str, Any]] = []

    for policy in policies:
        row_map: dict[int, dict[str, Any]] = {}

        for clause in policy.get("clauses", []):
            row = clause.get("source", {}).get("excel_row")
            if row is not None:
                row_map[row] = clause

        policy_maps.append(
            {
                "company": policy.get("company", ""),
                "row_map": row_map,
            }
        )

    merged_clauses: list[dict[str, Any]] = []

    for master_clause in master_policy.get("clauses", []):
        excel_row = master_clause.get("source", {}).get("excel_row")

        insurers: list[dict[str, Any]] = []

        for policy_map in policy_maps:
            clause = policy_map["row_map"].get(excel_row)

            if clause:
                insurers.append(
                    {
                        "company": policy_map["company"],
                        "uw_remark": clause.get("uw_remark", ""),
                        "remark_status": clause.get("remark_status", ""),
                        "source": clause.get("source", {}),
                    }
                )
            else:
                insurers.append(
                    {
                        "company": policy_map["company"],
                        "uw_remark": "",
                        "remark_status": "",
                        "source": {},
                    }
                )

        merged_clauses.append(
            {
                "excel_row": excel_row,
                "clause": master_clause.get("clause", ""),
                "requirement": master_clause.get("requirement", ""),
                "insurers": insurers,
            }
        )

    return {
        "policy": master_policy.get("policy", ""),
        "clauses": merged_clauses,
    }


def merge_policy_files(policy_files: list[str]) -> dict[str, Any]:
    policies: list[dict[str, Any]] = []

    for file_path in policy_files:
        with open(file_path, "r", encoding="utf-8") as file:
            policies.append(json.load(file))

    return merge_policy_records(policies)


def merged_policy_to_excel_bytes(data: dict[str, Any]) -> bytes:
    """Write one merged policy dict to a single-sheet workbook in memory."""
    buffer = BytesIO()
    pd.DataFrame(build_export_rows(data)).to_excel(buffer, index=False)
    buffer.seek(0)
    return buffer.getvalue()
