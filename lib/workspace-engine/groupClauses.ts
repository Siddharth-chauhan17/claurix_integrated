import type { Clause, ClauseCategory } from "@/types/workspace";
import type { GroupedClauses } from "./types";

const CATEGORY_LABELS: Record<ClauseCategory, string> = {
  financial: "Financial",
  coverage: "Coverage",
  exclusion: "Exclusions",
  limit: "Limits",
  deductible: "Deductibles",
  warranty: "Warranties",
  general: "General",
  other: "Other",
};

export function groupClauses(clauses: Clause[]): GroupedClauses[] {
  const map = new Map<ClauseCategory, Clause[]>();
  for (const clause of clauses) {
    const list = map.get(clause.category) ?? [];
    list.push(clause);
    map.set(clause.category, list);
  }
  return Array.from(map.entries()).map(([key, group]) => ({
    key,
    label: CATEGORY_LABELS[key] ?? key,
    clauses: group,
  }));
}
