/**
 * Build export payload from editing store, including uncommitted remark drafts.
 */

import type { ClauseComparison } from "./types";
import { findRemarkDraft, type InsurerRemarkDraft } from "./remark-drafts";

export function clausesWithRemarkDrafts(
  clauses: ClauseComparison[],
  remarkDrafts: readonly InsurerRemarkDraft[]
): ClauseComparison[] {
  if (remarkDrafts.length === 0) {
    return clauses;
  }

  return clauses.map((clause) => ({
    ...clause,
    comparisons: clause.comparisons.map((comparison) => {
      const draft = findRemarkDraft(
        [...remarkDrafts],
        clause.clause_id,
        comparison.insurer
      );
      if (!draft || draft.draft === comparison.proposal_clause) {
        return comparison;
      }
      return {
        ...comparison,
        proposal_clause: draft.draft,
      };
    }),
  }));
}
