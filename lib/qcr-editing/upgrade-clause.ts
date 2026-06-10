import { buildAiExplanation } from "./ai-explanation";
import type { ClauseComparison, ClauseReviewStatus } from "./types";

/** Backfill V2 fields on clauses saved before schema 2.0. */
export function upgradeClauseToV2(clause: ClauseComparison): ClauseComparison {
  return {
    ...clause,
    source: clause.source,
    broker_remark: clause.broker_remark ?? "",
    final_recommendation: clause.final_recommendation ?? null,
    review_status: (clause.review_status ?? "not_reviewed") as ClauseReviewStatus,
    comparisons: clause.comparisons.map((c) => ({
      ...c,
      ai_explanation:
        c.ai_explanation?.trim() ||
        buildAiExplanation(clause.rfq_clause, clause.rfq_requirement, c),
    })),
  };
}

export function upgradeClausesToV2(clauses: ClauseComparison[]): ClauseComparison[] {
  return clauses.map(upgradeClauseToV2);
}
