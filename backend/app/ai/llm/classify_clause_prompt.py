"""
Recall-optimized prompt for classify_clause_rows.

Worked examples use 1-based column_index to match policy_clause_extractor row prep.
"""

from __future__ import annotations

import json

CLASSIFY_CLAUSE_ROWS_INSTRUCTIONS = """You are an expert insurance underwriter's assistant. Your only task is to decide which rows in an insurance quote schedule contain a policy CLAUSE, as opposed to a heading, a summary figure, or an empty row.

OUTPUT FORMAT (STRICT)
Return ONLY a valid JSON array. No markdown, no code fences, no commentary before or after it.
You MUST return exactly one object per row_id provided. If 8 rows are given, return exactly 8 objects - never fewer, never more, never a different row_id.

[
  {"row_id": 0, "is_clause": false},
  {"row_id": 1, "is_clause": true}
]

HOW TO READ EACH ROW
Each row has one or more columns (column_index 1, 2, 3, ...). The clause text, requirement, or remark can be in ANY column, not just the first - a row with an empty or numeric first column can still be a clause if a later column has clause text. Judge the row as a whole, using every column.

WHAT IS A CLAUSE (is_clause: true)
A row is a clause if it states a specific term of cover - something that could differ between insurers and that a broker would compare quote to quote:
- Coverage clauses - what is/isn't covered, including limits, sub-limits, or scope of cover
  e.g. "Limit of Indemnity: $10,000,000 any one occurrence"
- Extensions - additional cover added to the base policy
  e.g. "Extension: Cross Liability clause included"
- Conditions - a requirement the insured must meet for cover to apply
  e.g. "Subject to compliance with the Fire Safety Warranty"
- Deductibles / Excess clauses - an amount payable by the insured before the insurer pays
  e.g. "Excess: $2,500 each and every claim"
- Special terms / endorsements / warranties - any bespoke restriction or modification to cover

A short row, or one that's just a number or label, is STILL a clause if that number/label defines an actual term of cover (a sub-limit, an excess amount, a deductible figure). Don't assume short means not a clause.

WHAT IS NOT A CLAUSE (is_clause: false)
- Titles/headings - only a section or policy name, no descriptive term, e.g. "PUBLIC LIABILITY"
- Premium / rate rows - the cost of the policy, not a term of cover
- Total / sum insured rows - the overall value of what's insured
- Blank rows - every column is empty or whitespace only

TRICKY CASES - READ CAREFULLY
- Sum insured vs. sub-limit: both can look like "label + number", but they are opposite
  categories. "Sum Insured: $5,000,000" is NOT a clause (overall insured value).
  "Sub-limit - Legal Defence Costs: $250,000" IS a clause (restricts scope of cover).
- Wrapped/continuation rows: if a row continues the text of the row above it (Excel
  word-wrap spilling onto the next row), judge it on its own content - if it still
  describes a term of cover, mark it true.
- A row containing only a clause reference number (e.g. "3.2") with no text in any other
  column is NOT a clause by itself - but if another column on that same row has
  descriptive text, it IS.
- If you are genuinely unsure after applying the above, mark it true. Missing a real
  clause is a worse outcome than flagging one extra row for a human to review.

WORKED EXAMPLES (same input shape you will receive)
Input: {"row_id": 12, "columns": [{"column_index":1,"value":"1.1"},{"column_index":2,"value":"Limit of Indemnity: $10,000,000 any one occurrence and in the aggregate"},{"column_index":3,"value":"Agreed"}]}
Output: {"row_id": 12, "is_clause": true}  -- states the actual limit of cover

Input: {"row_id": 13, "columns": [{"column_index":1,"value":"1.2"},{"column_index":2,"value":"Extension: Cross Liability clause included"},{"column_index":3,"value":"Included"}]}
Output: {"row_id": 13, "is_clause": true}  -- an extension to cover

Input: {"row_id": 14, "columns": [{"column_index":1,"value":""},{"column_index":2,"value":"Subject to compliance with the Fire Safety Warranty"},{"column_index":3,"value":"Noted"}]}
Output: {"row_id": 14, "is_clause": true}  -- a condition on cover

Input: {"row_id": 15, "columns": [{"column_index":1,"value":"1.3"},{"column_index":2,"value":"Excess"},{"column_index":3,"value":"$2,500 each and every claim"}]}
Output: {"row_id": 15, "is_clause": true}  -- the amount is in column 3, not column 2; still a clause

Input: {"row_id": 16, "columns": [{"column_index":1,"value":""},{"column_index":2,"value":"Sub-limit - Legal Defence Costs"},{"column_index":3,"value":"$250,000"}]}
Output: {"row_id": 16, "is_clause": true}  -- restricts scope of cover

Input: {"row_id": 17, "columns": [{"column_index":1,"value":""},{"column_index":2,"value":"Sum Insured"},{"column_index":3,"value":"$5,000,000"}]}
Output: {"row_id": 17, "is_clause": false}  -- overall insured value, not a term of cover

Input: {"row_id": 10, "columns": [{"column_index":1,"value":""},{"column_index":2,"value":"PUBLIC LIABILITY"},{"column_index":3,"value":""}]}
Output: {"row_id": 10, "is_clause": false}  -- section title only

Input: {"row_id": 30, "columns": [{"column_index":1,"value":""},{"column_index":2,"value":"Total Premium"},{"column_index":3,"value":"$18,450.00"}]}
Output: {"row_id": 30, "is_clause": false}  -- cost of the policy, not a term of cover

Input: {"row_id": 20, "columns": [{"column_index":1,"value":""},{"column_index":2,"value":""},{"column_index":3,"value":""}]}
Output: {"row_id": 20, "is_clause": false}  -- blank row
"""


def build_classify_clause_rows_prompt(
    company_name: str,
    policy_name: str,
    rows_for_llm: list,
    *,
    retry: bool = False,
) -> str:
    n = len(rows_for_llm)
    correction = ""
    if retry:
        correction = (
            f"\nCORRECTION: Your previous response did not include exactly {n} row_id "
            f"entries. Return exactly {n} objects — one per row_id below. Do not skip "
            "any row_id.\n"
        )
    return f"""{CLASSIFY_CLAUSE_ROWS_INSTRUCTIONS}
{correction}
Company: {company_name}
Policy: {policy_name}

Rows to classify ({n} total):
{json.dumps(rows_for_llm, indent=2)}

Return exactly {n} JSON objects, one per row_id above, in the format shown earlier. Do not skip any row_id. Return ONLY the JSON array."""
