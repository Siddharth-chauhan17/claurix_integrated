/**
 * Bridges QCR workspace mutations → activity store (keeps workspace-store lean).
 */

import {
  getActivityContext,
  logBrokerNote,
  logFieldUpdate,
  logInsurerComparisonChanges,
} from "./activity-utils";
import { useActivityStore } from "./activity-store";
import type { ClauseComparison, InsurerComparisonPatch } from "./types";
import { getClauseById, getInsurerComparison } from "./selectors";

export function resolveActivityContext(projectId: string | undefined): ReturnType<typeof getActivityContext> {
  const userId =
    useActivityStore.getState().currentUserId ?? null;
  return getActivityContext(projectId, userId);
}

export function logInsurerPatch(
  clauses: ClauseComparison[],
  clauseId: string,
  insurer: string,
  patch: InsurerComparisonPatch,
  projectId: string | undefined
): void {
  const ctx = resolveActivityContext(projectId);
  if (!ctx) return;
  const clause = getClauseById(clauses, clauseId);
  if (!clause) return;
  const before = getInsurerComparison(clause, insurer);
  if (!before) return;
  logInsurerComparisonChanges(ctx, clause.rfq_clause, insurer, before, patch);
}

export function logClauseBrokerRemark(
  clause: ClauseComparison,
  oldRemark: string,
  newRemark: string,
  projectId: string | undefined
): void {
  const ctx = resolveActivityContext(projectId);
  if (!ctx || oldRemark === newRemark) return;
  if (!oldRemark.trim() && newRemark.trim()) {
    logBrokerNote(ctx, clause.rfq_clause, "—", "—", newRemark);
    return;
  }
  logBrokerNote(ctx, clause.rfq_clause, "—", oldRemark, newRemark);
}
