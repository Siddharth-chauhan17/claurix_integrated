/**
 * Pure selectors for QCR editing workspace — no React, no Zustand.
 * Reusable by web, mobile, export, and future persistence layer.
 */

import type {
  ClauseComparison,
  ClauseComparisonPatch,
  ComparisonStatus,
  InsurerComparison,
  InsurerComparisonPatch,
  QcrSectionId,
  QcrWorkspace,
} from "./types";

export type ClauseFilter = {
  search?: string;
  statuses?: ComparisonStatus[];
  insurer?: string;
  minGap?: number;
  maxGap?: number;
};

/** Effective status after broker override. */
export function getEffectiveStatus(comparison: InsurerComparison): ComparisonStatus {
  return comparison.override_status ?? comparison.status;
}

export function getClauseById(
  clauses: ClauseComparison[],
  clauseId: string
): ClauseComparison | undefined {
  return clauses.find((c) => c.clause_id === clauseId);
}

export function getInsurerComparison(
  clause: ClauseComparison,
  insurer: string
): InsurerComparison | undefined {
  return clause.comparisons.find((c) => c.insurer === insurer);
}

export function getInsurerColumns(workspace: QcrWorkspace | null): string[] {
  if (!workspace) return [];
  return workspace.insurers;
}

export function countByEffectiveStatus(
  clauses: ClauseComparison[],
  insurer?: string
): Record<ComparisonStatus, number> {
  const counts: Record<ComparisonStatus, number> = {
    agreed: 0,
    partially_agreed: 0,
    not_agreed: 0,
    not_applicable: 0,
    pending_review: 0,
  };
  for (const clause of clauses) {
    const comparisons = insurer
      ? clause.comparisons.filter((c) => c.insurer === insurer)
      : clause.comparisons;
    for (const c of comparisons) {
      counts[getEffectiveStatus(c)] += 1;
    }
  }
  return counts;
}

export function averageGapScore(
  clauses: ClauseComparison[],
  insurer?: string
): number {
  let sum = 0;
  let n = 0;
  for (const clause of clauses) {
    const comparisons = insurer
      ? clause.comparisons.filter((c) => c.insurer === insurer)
      : clause.comparisons;
    for (const c of comparisons) {
      sum += c.gap_score;
      n += 1;
    }
  }
  return n === 0 ? 0 : Math.round((sum / n) * 10) / 10;
}

export function filterClausesBySection(
  clauses: ClauseComparison[],
  sectionId: QcrSectionId | "all"
): ClauseComparison[] {
  if (sectionId === "all") return clauses;
  return clauses.filter((c) => c.section_id === sectionId);
}

export function countClausesBySection(
  clauses: ClauseComparison[]
): Record<QcrSectionId, number> {
  return {
    property_damage: clauses.filter((c) => c.section_id === "property_damage")
      .length,
    business_interruption: clauses.filter(
      (c) => c.section_id === "business_interruption"
    ).length,
    extensions: clauses.filter((c) => c.section_id === "extensions").length,
    special_conditions: clauses.filter(
      (c) => c.section_id === "special_conditions"
    ).length,
  };
}

export function filterClauses(
  clauses: ClauseComparison[],
  filter: ClauseFilter
): ClauseComparison[] {
  const q = filter.search?.trim().toLowerCase() ?? "";
  return clauses.filter((clause) => {
    if (q) {
      const hay = [
        clause.rfq_clause,
        clause.rfq_requirement,
        clause.broker_remark,
        ...clause.comparisons.flatMap((c) => [
          c.insurer,
          c.proposal_clause,
          c.broker_note,
          c.ai_explanation,
          ...c.differences,
        ]),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (filter.insurer) {
      const row = getInsurerComparison(clause, filter.insurer);
      if (!row) return false;
      if (filter.statuses?.length && !filter.statuses.includes(getEffectiveStatus(row))) {
        return false;
      }
      if (filter.minGap != null && row.gap_score < filter.minGap) return false;
      if (filter.maxGap != null && row.gap_score > filter.maxGap) return false;
      return true;
    }

    if (filter.statuses?.length) {
      const anyMatch = clause.comparisons.some((c) =>
        filter.statuses!.includes(getEffectiveStatus(c))
      );
      if (!anyMatch) return false;
    }

    return true;
  });
}

export function hasBrokerOverride(comparison: InsurerComparison): boolean {
  return comparison.override_status !== null;
}

export function clauseHasUnsavedEdits(
  clause: ClauseComparison,
  baseline: ClauseComparison
): boolean {
  return JSON.stringify(clause) !== JSON.stringify(baseline);
}

/** Immutable patch helper for store actions. */
export function applyInsurerComparisonPatch(
  clause: ClauseComparison,
  insurer: string,
  patch: InsurerComparisonPatch
): ClauseComparison {
  return {
    ...clause,
    comparisons: clause.comparisons.map((c) =>
      c.insurer === insurer ? { ...c, ...patch } : c
    ),
  };
}

export function applyClausePatch(
  clause: ClauseComparison,
  patch: ClauseComparisonPatch
): ClauseComparison {
  return { ...clause, ...patch };
}

export type WorkspaceSummary = {
  clauseCount: number;
  insurerCount: number;
  statusCounts: Record<ComparisonStatus, number>;
  overrideCount: number;
  avgGap: number;
};

export function getWorkspaceSummary(clauses: ClauseComparison[]): WorkspaceSummary {
  let overrideCount = 0;
  for (const clause of clauses) {
    for (const c of clause.comparisons) {
      if (hasBrokerOverride(c)) overrideCount += 1;
    }
  }
  return {
    clauseCount: clauses.length,
    insurerCount: new Set(clauses.flatMap((c) => c.comparisons.map((x) => x.insurer)))
      .size,
    statusCounts: countByEffectiveStatus(clauses),
    overrideCount,
    avgGap: averageGapScore(clauses),
  };
}
