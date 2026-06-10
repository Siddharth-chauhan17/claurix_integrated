import type { Clause, WorkspaceResponse } from "@/types/workspace";
import { getClausesForSection } from "./getClausesForSection";

/** Collect insurer column names in stable first-seen order from clause values. */
export function getInsurerColumns(
  workspace: WorkspaceResponse,
  sectionId: string
): string[] {
  const clauses = getClausesForSection(workspace, sectionId);
  return getInsurerColumnsFromClauses(clauses);
}

export function getInsurerColumnsFromClauses(clauses: Clause[]): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const clause of clauses) {
    for (const v of clause.values) {
      if (!seen.has(v.insurer)) {
        seen.add(v.insurer);
        columns.push(v.insurer);
      }
    }
  }
  return columns;
}
