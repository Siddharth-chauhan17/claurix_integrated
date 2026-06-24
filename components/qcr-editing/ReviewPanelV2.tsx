"use client";

/**
 * V2 — clause-centric review workspace.
 * Shows all insurer comparisons for the active clause; broker conclusion at clause level.
 */

import { useEffect, useRef, useState } from "react";
import { findRemarkDraft } from "@/lib/qcr-editing/remark-drafts";
import { getClauseById } from "@/lib/qcr-editing/selectors";
import {
  CLAUSE_REVIEW_STATUS_LABELS,
  type ClauseReviewStatus,
  type InsurerComparison,
} from "@/lib/qcr-editing/types";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";
import { GapScoreIndicator } from "./GapScoreIndicator";
import { isAwaitingInsurerTerms } from "./InsurerCell";
import { PanelToggleButton } from "./PanelToggleButton";
import { StatusBadge } from "./StatusBadge";

const REVIEW_STATUSES: ClauseReviewStatus[] = [
  "not_reviewed",
  "in_review",
  "reviewed",
  "escalated",
];

const NO_RECOMMENDATION_VALUE = "";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

type PendingInsurerRemark = {
  clause_id: string;
  rfq_clause: string;
  insurer: string;
  draft: string;
  baseline: string;
};

function InsurerComparisonCard({
  comparison,
  highlighted,
  draftValue,
  isDirty,
  isSaving,
  onDraftChange,
  onSave,
  onDiscard,
}: {
  comparison: InsurerComparison;
  highlighted: boolean;
  draftValue: string;
  isDirty: boolean;
  isSaving: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const awaiting = isAwaitingInsurerTerms(comparison);

  return (
    <article
      className={cn(
        "rounded-lg border bg-white p-3 shadow-sm transition",
        highlighted
          ? "border-primary-400 ring-2 ring-primary-200"
          : "border-slate-200",
        isDirty && "border-amber-300"
      )}
    >
      <h3 className="text-sm font-semibold text-slate-900">{comparison.insurer}</h3>

      <div className="mt-3 space-y-3">
        <label className="block">
          <div className="flex items-center justify-between gap-2">
            <FieldLabel>Insurer remark</FieldLabel>
            {isDirty ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onDiscard}
                  className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="rounded-md bg-primary-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
          </div>
          {awaiting ? (
            <p className="mt-1 text-sm text-slate-500">Awaiting insurer terms</p>
          ) : (
            <textarea
              value={draftValue}
              onChange={(e) => onDraftChange(e.target.value)}
              rows={3}
              className={cn(
                "mt-1 w-full rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200",
                isDirty ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
              )}
              aria-label={`Insurer remark for ${comparison.insurer}`}
            />
          )}
        </label>

        <div className="flex flex-wrap items-start gap-4">
          <div>
            <FieldLabel>Result</FieldLabel>
            <div className="mt-1">
              <StatusBadge comparison={comparison} />
            </div>
          </div>
          <div>
            <FieldLabel>Gap score</FieldLabel>
            <div className="mt-1">
              <GapScoreIndicator score={comparison.gap_score} />
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Differences</FieldLabel>
          {comparison.differences.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">None</p>
          ) : (
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-700">
              {comparison.differences.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

export function ReviewPanelV2() {
  const clauses = useQcrEditingStore((s) => s.clauses);
  const remarkDrafts = useQcrEditingStore((s) => s.draft.remarkDrafts);
  const workspace = useQcrEditingStore((s) => s.workspace);
  const activeClauseId = useQcrEditingStore((s) => s.ui.activeClauseId);
  const activeInsurer = useQcrEditingStore((s) => s.ui.activeInsurer);
  const rightPanelOpen = useQcrEditingStore((s) => s.ui.rightPanelOpen);
  const isSaving = useQcrEditingStore((s) => s.ui.isSaving);
  const toggleRightPanel = useQcrEditingStore((s) => s.toggleRightPanel);
  const updateClause = useQcrEditingStore((s) => s.updateClause);
  const updateProposalClause = useQcrEditingStore((s) => s.updateProposalClause);
  const upsertRemarkDraft = useQcrEditingStore((s) => s.upsertRemarkDraft);
  const discardRemarkDraft = useQcrEditingStore((s) => s.discardRemarkDraft);
  const revertClause = useQcrEditingStore((s) => s.revertClause);

  const [pendingRemark, setPendingRemark] = useState<PendingInsurerRemark | null>(
    null
  );
  const pendingRef = useRef(pendingRemark);
  pendingRef.current = pendingRemark;

  const clause = activeClauseId ? getClauseById(clauses, activeClauseId) : null;
  const insurers = workspace?.insurers ?? [];

  const persistPendingToDrafts = (pending: PendingInsurerRemark | null) => {
    if (!pending || pending.draft === pending.baseline) return;
    upsertRemarkDraft({
      clause_id: pending.clause_id,
      rfq_clause: pending.rfq_clause,
      insurer: pending.insurer,
      draft: pending.draft,
      baseline: pending.baseline,
    });
  };

  /** Save in-progress edit as draft when user moves to another clause/insurer. */
  useEffect(() => {
    persistPendingToDrafts(pendingRef.current);
    setPendingRemark(null);
  }, [activeClauseId, activeInsurer, upsertRemarkDraft]);

  useEffect(() => {
    const flushPending = () => persistPendingToDrafts(pendingRef.current);
    window.addEventListener("beforeunload", flushPending);
    return () => window.removeEventListener("beforeunload", flushPending);
  }, [upsertRemarkDraft]);

  const handleRemarkDraft = (
    insurer: string,
    draft: string,
    baseline: string
  ) => {
    if (!clause) return;

    const current = pendingRef.current;
    if (
      current &&
      current.insurer !== insurer &&
      current.draft !== current.baseline
    ) {
      upsertRemarkDraft({
        clause_id: current.clause_id,
        rfq_clause: current.rfq_clause,
        insurer: current.insurer,
        draft: current.draft,
        baseline: current.baseline,
      });
    }

    setPendingRemark({
      clause_id: clause.clause_id,
      rfq_clause: clause.rfq_clause,
      insurer,
      draft,
      baseline,
    });
  };

  const handleRemarkSave = (insurer: string) => {
    if (!clause || isSaving) return;

    const stored = findRemarkDraft(remarkDrafts, clause.clause_id, insurer);
    const pending =
      pendingRemark?.insurer === insurer ? pendingRemark : null;
    const text = pending?.draft ?? stored?.draft;
    if (text === undefined) return;

    updateProposalClause(clause.clause_id, insurer, text);
    setPendingRemark(null);
  };

  const handleRemarkDiscard = (insurer: string) => {
    if (!clause) return;
    discardRemarkDraft(clause.clause_id, insurer);
    if (pendingRemark?.insurer === insurer) {
      setPendingRemark(null);
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-l border-slate-200 bg-slate-50/80 shadow-xl shadow-slate-200/50 transition-[width] duration-200 ease-out",
        rightPanelOpen ? "w-[440px]" : "w-[52px]"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-slate-200 bg-white",
          rightPanelOpen
            ? "items-start justify-between gap-2 px-4 py-3"
            : "flex-col items-center gap-2 px-2 py-3"
        )}
      >
        {rightPanelOpen ? (
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Clause workspace</h2>
            <p className="text-xs text-slate-500">
              Compare all insurers · one broker conclusion
            </p>
          </div>
        ) : (
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 [writing-mode:vertical-rl]"
            title="Clause workspace"
          >
            Clause
          </span>
        )}
        <PanelToggleButton
          collapsed={!rightPanelOpen}
          onClick={() => toggleRightPanel()}
          variant="light"
          side="right"
          expandAriaLabel="Expand clause workspace"
          collapseAriaLabel="Collapse clause workspace"
        />
      </div>

      {rightPanelOpen ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!clause ? (
            <p className="text-sm text-slate-500">
              Select any cell in the comparison grid to open this clause workspace.
            </p>
          ) : (
            <div className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white p-3">
                <FieldLabel>RFQ clause</FieldLabel>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {clause.rfq_clause}
                </p>
                <FieldLabel>RFQ requirement</FieldLabel>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {clause.rfq_requirement}
                </p>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Insurer comparison
                </h3>
                <div className="mt-2 space-y-3">
                  {clause.comparisons.map((comparison) => {
                    const stored = findRemarkDraft(
                      remarkDrafts,
                      clause.clause_id,
                      comparison.insurer
                    );
                    const isPending =
                      pendingRemark?.insurer === comparison.insurer;
                    const baseline = comparison.proposal_clause;
                    const storedBaseline = stored?.baseline ?? baseline;
                    const draftValue = isPending
                      ? pendingRemark.draft
                      : stored
                        ? stored.draft
                        : baseline;
                    const effectiveBaseline = isPending
                      ? pendingRemark.baseline
                      : storedBaseline;
                    const isDirty = draftValue !== effectiveBaseline;

                    return (
                      <InsurerComparisonCard
                        key={comparison.insurer}
                        comparison={comparison}
                        highlighted={comparison.insurer === activeInsurer}
                        draftValue={draftValue}
                        isDirty={isDirty}
                        isSaving={isSaving}
                        onDraftChange={(value) =>
                          handleRemarkDraft(
                            comparison.insurer,
                            value,
                            isPending
                              ? pendingRemark.baseline
                              : stored
                                ? stored.baseline
                                : baseline
                          )
                        }
                        onSave={() => handleRemarkSave(comparison.insurer)}
                        onDiscard={() =>
                          handleRemarkDiscard(comparison.insurer)
                        }
                      />
                    );
                  })}
                </div>
              </section>

              <label className="block rounded-lg border border-slate-200 bg-white p-3">
                <FieldLabel>Broker remark</FieldLabel>
                <textarea
                  value={clause.broker_remark}
                  onChange={(e) =>
                    updateClause(clause.clause_id, {
                      broker_remark: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder='e.g. "HDFC and ICICI comply fully. Recommend HDFC."'
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
                />
              </label>

              <label className="block rounded-lg border border-slate-200 bg-white p-3">
                <FieldLabel>Final recommendation</FieldLabel>
                <select
                  value={clause.final_recommendation ?? NO_RECOMMENDATION_VALUE}
                  onChange={(e) =>
                    updateClause(clause.clause_id, {
                      final_recommendation:
                        e.target.value === NO_RECOMMENDATION_VALUE
                          ? null
                          : e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
                >
                  <option value={NO_RECOMMENDATION_VALUE}>No Recommendation</option>
                  {insurers.map((insurer) => (
                    <option key={insurer} value={insurer}>
                      {insurer}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block rounded-lg border border-slate-200 bg-white p-3">
                <FieldLabel>Clause review status</FieldLabel>
                <select
                  value={clause.review_status}
                  onChange={(e) =>
                    updateClause(clause.clause_id, {
                      review_status: e.target.value as ClauseReviewStatus,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
                >
                  {REVIEW_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CLAUSE_REVIEW_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => revertClause(clause.clause_id)}
                className="w-full text-center text-xs font-medium text-slate-500 hover:text-red-600"
              >
                Revert all edits on this clause
              </button>
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}
