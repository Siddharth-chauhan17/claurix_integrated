/**
 * Aligns clause `source` metadata with the uploaded RFQ workbook when possible.
 * RFQ-only — never reads insurer quote files.
 *
 * AI/mock source may reference placeholder sheet rows; this locates the clause
 * text in the persisted RFQ and rewrites `sheet_name` + A1 cell refs for lookup.
 */

import type { RfqWorkbook } from "@/types/project-workspace";
import type { ClauseComparison, ClauseSource, QcrWorkspace } from "./types";

function columnIndexToLetters(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function findClauseInRfqWorkbook(
  workbook: RfqWorkbook,
  rfqClause: string
): Omit<ClauseSource, "file_name"> | null {
  const target = rfqClause.trim().toLowerCase();
  if (!target) return null;

  for (const sheet of workbook.sheets) {
    const clauseColKey = sheet.columns[1] ?? sheet.columns[0];
    if (!clauseColKey) continue;

    const requirementColKey = sheet.columns[2] ?? null;

    for (const row of sheet.rows) {
      const text = String(row[clauseColKey] ?? "").trim().toLowerCase();
      if (text !== target) continue;

      const excelRow = row._rowIndex + 1;
      const clauseCol = columnIndexToLetters(
        Math.max(0, sheet.columns.indexOf(clauseColKey))
      );
      const requirementCol = requirementColKey
        ? columnIndexToLetters(sheet.columns.indexOf(requirementColKey))
        : "C";

      return {
        sheet_name: sheet.name,
        excel_row: excelRow,
        clause_cell: `${clauseCol}${excelRow}`,
        requirement_cell: `${requirementCol}${excelRow}`,
        uw_remark_cell: `F${excelRow}`,
      };
    }
  }

  return null;
}

/** Patch workspace clauses so Source lookup targets cells in the uploaded RFQ. */
export function alignWorkspaceSourcesWithRfq(
  workspace: QcrWorkspace,
  rfqWorkbook: RfqWorkbook | null
): QcrWorkspace {
  if (!rfqWorkbook) return workspace;

  const clauses: ClauseComparison[] = workspace.clauses.map((clause) => {
    const located = findClauseInRfqWorkbook(rfqWorkbook, clause.rfq_clause);
    if (!located) return clause;

    return {
      ...clause,
      source: {
        ...clause.source,
        file_name: rfqWorkbook.fileName,
        ...located,
      },
    };
  });

  return { ...workspace, clauses };
}
