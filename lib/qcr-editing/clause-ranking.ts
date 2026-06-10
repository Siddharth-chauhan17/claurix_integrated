import { getEffectiveStatus } from "./selectors";
import type { ComparisonStatus, InsurerComparison } from "./types";

const STATUS_MATCH_WEIGHT: Record<ComparisonStatus, number> = {
  agreed: 100,
  partially_agreed: 72,
  not_applicable: 55,
  pending_review: 45,
  not_agreed: 25,
};

/**
 * Coverage match score (0–100) from gap score and alignment status.
 * Higher = better fit vs RFQ for ranking insurers on a clause.
 */
export function coverageMatchScore(comparison: InsurerComparison): number {
  const status = getEffectiveStatus(comparison);
  const gapComponent = Math.max(0, 100 - comparison.gap_score);
  const score = gapComponent * 0.65 + STATUS_MATCH_WEIGHT[status] * 0.35;
  return Math.round(Math.min(100, Math.max(0, score)));
}

export type InsurerRankEntry = {
  insurer: string;
  rank: number;
  matchScore: number;
  comparison: InsurerComparison;
};

export function rankInsurerComparisons(
  comparisons: InsurerComparison[]
): InsurerRankEntry[] {
  const sorted = [...comparisons].sort(
    (a, b) => coverageMatchScore(b) - coverageMatchScore(a)
  );
  return sorted.map((comparison, index) => ({
    insurer: comparison.insurer,
    rank: index + 1,
    matchScore: coverageMatchScore(comparison),
    comparison,
  }));
}
