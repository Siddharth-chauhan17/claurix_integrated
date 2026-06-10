"use client";

import { getClauseById, getInsurerComparison } from "@/lib/qcr-editing/selectors";
import { STATUS_LABELS } from "@/lib/qcr-editing/status-styles";
import type { ComparisonStatus } from "@/lib/qcr-editing/types";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";
import { GapScoreIndicator } from "./GapScoreIndicator";
import { PanelToggleButton } from "./PanelToggleButton";
import { StatusBadge } from "./StatusBadge";

const ALL_STATUSES: ComparisonStatus[] = [
  "agreed",
  "partially_agreed",
  "not_agreed",
  "not_applicable",
  "pending_review",
];

export function ReviewPanel() {
  const clauses = useQcrEditingStore((s) => s.clauses);
  const activeClauseId = useQcrEditingStore((s) => s.ui.activeClauseId);
  const activeInsurer = useQcrEditingStore((s) => s.ui.activeInsurer);
  const rightPanelOpen = useQcrEditingStore((s) => s.ui.rightPanelOpen);
  const toggleRightPanel = useQcrEditingStore((s) => s.toggleRightPanel);

  const updateProposalClause = useQcrEditingStore((s) => s.updateProposalClause);
  const updateBrokerNote = useQcrEditingStore((s) => s.updateBrokerNote);
  const updateComparisonStatus = useQcrEditingStore((s) => s.updateComparisonStatus);
  const updateDifferences = useQcrEditingStore((s) => s.updateDifferences);
  const updateGapScore = useQcrEditingStore((s) => s.updateGapScore);
  const setBrokerOverride = useQcrEditingStore((s) => s.setBrokerOverride);
  const markReviewed = useQcrEditingStore((s) => s.markReviewed);
  const revertClause = useQcrEditingStore((s) => s.revertClause);

  const clause = activeClauseId ? getClauseById(clauses, activeClauseId) : null;
  const comparison =
    clause && activeInsurer
      ? getInsurerComparison(clause, activeInsurer)
      : null;

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-l border-slate-200 bg-white shadow-xl shadow-slate-200/50 transition-[width] duration-200 ease-out",
        rightPanelOpen ? "w-[360px]" : "w-[52px]"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-slate-100 bg-slate-50",
          rightPanelOpen
            ? "items-start justify-between gap-2 px-4 py-3"
            : "flex-col items-center gap-2 px-2 py-3"
        )}
      >
        {rightPanelOpen ? (
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Review panel</h2>
            <p className="text-xs text-slate-500">
              Human-in-the-loop edits & broker overrides
            </p>
          </div>
        ) : (
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 [writing-mode:vertical-rl]"
            title="Review panel"
          >
            Review
          </span>
        )}
        <PanelToggleButton
          collapsed={!rightPanelOpen}
          onClick={() => toggleRightPanel()}
          variant="light"
          side="right"
          expandAriaLabel="Expand review panel"
          collapseAriaLabel="Collapse review panel"
        />
      </div>

      {rightPanelOpen ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!clause || !comparison ? (
            <p className="text-sm text-slate-500">
              Select an insurer cell in the comparison grid to review and edit.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  RFQ clause
                </p>
                <p className="mt-1 font-semibold text-slate-900">{clause.rfq_clause}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {clause.rfq_requirement}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs font-semibold text-slate-700">{activeInsurer}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge comparison={comparison} />
                  <GapScoreIndicator score={comparison.gap_score} />
                </div>
              </div>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Proposal text
                </span>
                <textarea
                  value={comparison.proposal_clause}
                  onChange={(e) =>
                    updateProposalClause(
                      clause.clause_id,
                      comparison.insurer,
                      e.target.value
                    )
                  }
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  AI status
                </span>
                <select
                  value={comparison.status}
                  onChange={(e) =>
                    updateComparisonStatus(
                      clause.clause_id,
                      comparison.insurer,
                      e.target.value as ComparisonStatus
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Broker override status
                </span>
                <select
                  value={comparison.override_status ?? ""}
                  onChange={(e) =>
                    setBrokerOverride(
                      clause.clause_id,
                      comparison.insurer,
                      e.target.value === "" ? null : (e.target.value as ComparisonStatus)
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
                >
                  <option value="">No override (use AI status)</option>
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Gap score (0–100)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={comparison.gap_score}
                  onChange={(e) =>
                    updateGapScore(
                      clause.clause_id,
                      comparison.insurer,
                      Number(e.target.value)
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-primary-400"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Differences (one per line)
                </span>
                <textarea
                  value={comparison.differences.join("\n")}
                  onChange={(e) =>
                    updateDifferences(
                      clause.clause_id,
                      comparison.insurer,
                      e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean)
                    )
                  }
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-700 outline-none focus:border-primary-400"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-400">
                  Broker note
                </span>
                <textarea
                  value={comparison.broker_note}
                  onChange={(e) =>
                    updateBrokerNote(
                      clause.clause_id,
                      comparison.insurer,
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="Placement notes, negotiation context…"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  markReviewed(
                    clause.clause_id,
                    comparison.insurer,
                    !comparison.reviewed
                  )
                }
                className={cn(
                  "w-full rounded-lg py-2.5 text-sm font-semibold transition",
                  comparison.reviewed
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                {comparison.reviewed ? "Mark as not reviewed" : "Mark as reviewed"}
              </button>

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
