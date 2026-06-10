import type { Clause } from "@/types/workspace";
import type { WorkspaceFilters } from "./types";

export function filterClauses(
  clauses: Clause[],
  filters: WorkspaceFilters
): Clause[] {
  let result = clauses;

  if (filters.categories.length > 0) {
    const cats = new Set(filters.categories);
    result = result.filter((c) => cats.has(c.category));
  }

  if (filters.riskLevels.length > 0) {
    const risks = new Set(filters.riskLevels);
    result = result.filter((c) => risks.has(c.ai_analysis.risk_level));
  }

  return result;
}
