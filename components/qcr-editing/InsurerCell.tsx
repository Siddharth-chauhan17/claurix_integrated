"use client";

import type { InsurerComparison } from "@/lib/qcr-editing/types";
import { getEffectiveStatus } from "@/lib/qcr-editing/selectors";
import { cn } from "@/lib/utils";
import { GapScoreIndicator } from "./GapScoreIndicator";
import { StatusBadge } from "./StatusBadge";

export function isAwaitingInsurerTerms(comparison: InsurerComparison): boolean {
  return (
    !comparison.proposal_clause.trim() &&
    getEffectiveStatus(comparison) === "pending_review"
  );
}

export function InsurerCell({
  comparison,
  selected,
  onSelect,
}: {
  comparison: InsurerComparison;
  selected: boolean;
  onSelect: () => void;
}) {
  const awaiting = isAwaitingInsurerTerms(comparison);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-full w-full flex-col gap-2 border-l border-slate-100 p-3 text-left transition",
        selected ? "bg-primary-50/60 ring-1 ring-inset ring-primary-200" : "hover:bg-slate-50/80"
      )}
    >
      {awaiting ? (
        <div>
          <p className="text-xs font-medium text-slate-500">Awaiting insurer terms</p>
          <p className="mt-1 text-[10px] leading-snug text-slate-400">
            AI has not returned a quote for this clause yet.
          </p>
        </div>
      ) : (
        <p className="line-clamp-3 text-xs leading-relaxed text-slate-800">
          {comparison.proposal_clause}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge comparison={comparison} compact />
        {comparison.reviewed ? (
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            Reviewed
          </span>
        ) : null}
      </div>
      <GapScoreIndicator score={comparison.gap_score} />
      {comparison.differences.length > 0 ? (
        <p className="text-[10px] text-slate-500">
          {comparison.differences.length} difference
          {comparison.differences.length !== 1 ? "s" : ""}
        </p>
      ) : null}
    </button>
  );
}
