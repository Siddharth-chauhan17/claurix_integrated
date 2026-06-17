/**
 * Aligns clause `source` metadata with the uploaded RFQ workbook when possible.
 * RFQ-only — never reads insurer quote files.
 *
 * AI/mock source may reference placeholder sheet rows; this locates the clause
 * text in the persisted RFQ and rewrites `sheet_name` + A1 cell refs for lookup.
 */

import type { RfqWorkbook } from "@/types/project-workspace";
import { findClauseColumns } from "@/lib/project-workspace/sheetColumns";
import type { ClauseComparison, ClauseSource, QcrWorkspace } from "./types";

function findClauseInRfqWorkbook(
  workbook: RfqWorkbook,
  rfqClause: string
): Omit<ClauseSource, "file_name"> | null {
  const target = rfqClause.trim().toLowerCase();
  if (!target) return null;

  for (const sheet of workbook.sheets) {
    const { clause: clauseCol, requirement: requirementCol } =
      findClauseColumns(sheet);
    if (!clauseCol) continue;

    for (const row of sheet.rows) {
      const text = String(row[clauseCol.field] ?? "").trim().toLowerCase();
      if (text !== target) continue;

      const excelRow = row._rowIndex;
      return {
        sheet_name: sheet.name,
        excel_row: excelRow,
        clause_cell: `${clauseCol.letter}${excelRow}`,
        requirement_cell: `${requirementCol?.letter ?? "C"}${excelRow}`,
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
