import type { ComparisonMatrix } from "./types";
import type { WorkspaceResponse } from "@/types/workspace";
import { getClausesForSection } from "./getClausesForSection";
import { getInsurerColumnsFromClauses } from "./getInsurerColumns";

/**
 * Tabular view model for renderers (AG Grid, export, etc.).
 * Rows = clauses; columns = metadata + dynamic insurers from JSON.
 */
export function buildComparisonMatrix(
  workspace: WorkspaceResponse,
  sectionId: string
): ComparisonMatrix | null {
  const section = workspace.sections.find((s) => s.section_id === sectionId);
  if (!section) return null;

  const clauses = getClausesForSection(workspace, sectionId);
  const insurer_columns = getInsurerColumnsFromClauses(clauses);

  const rows = clauses.map((clause) => {
    const insurers: Record<string, string> = {};
    for (const col of insurer_columns) {
      insurers[col] =
        clause.values.find((v) => v.insurer === col)?.value ?? "—";
    }
    return {
      clause_id: clause.clause_id,
      title: clause.title,
      category: clause.category,
      comparison_type: clause.comparison_type,
      editable: clause.editable,
      risk_level: clause.ai_analysis.risk_level,
      insurers,
    };
  });

  return {
    section_id: section.section_id,
    section_name: section.section_name,
    insurer_columns,
    rows,
  };
}
