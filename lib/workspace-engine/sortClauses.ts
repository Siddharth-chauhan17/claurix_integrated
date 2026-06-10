import type { Clause } from "@/types/workspace";

export type ClauseSortKey = "title" | "category" | "risk";

const RISK_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortClauses(
  clauses: Clause[],
  sortKey: ClauseSortKey = "title"
): Clause[] {
  const copy = [...clauses];
  copy.sort((a, b) => {
    if (sortKey === "risk") {
      return (
        (RISK_RANK[a.ai_analysis.risk_level] ?? 9) -
        (RISK_RANK[b.ai_analysis.risk_level] ?? 9)
      );
    }
    if (sortKey === "category") {
      return a.category.localeCompare(b.category);
    }
    return a.title.localeCompare(b.title);
  });
  return copy;
}
