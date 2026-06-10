import type { Clause } from "@/types/workspace";

export function searchClauses(clauses: Clause[], query: string): Clause[] {
  const q = query.trim().toLowerCase();
  if (!q) return clauses;
  return clauses.filter((c) => {
    const haystack = [
      c.title,
      c.clause_id,
      c.category,
      c.comparison_type,
      ...c.values.map((v) => `${v.insurer} ${v.value}`),
      c.ai_analysis.summary,
      c.ai_analysis.recommendation,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
