"use client";

import { memo } from "react";
import {
  formatActivityDate,
  getActivityTypeBadgeStyle,
  type EnrichedActivityEvent,
} from "@/lib/qcr-editing/activity-selectors";
import { cn } from "@/lib/utils";

function ValueChange({
  oldValue,
  newValue,
  compact,
}: {
  oldValue: string;
  newValue: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("mt-2 space-y-1", compact && "mt-1")}>
      <p
        className={cn(
          "rounded bg-red-50/80 px-2 py-1 font-mono text-slate-600 line-through decoration-red-300",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        {oldValue || "—"}
      </p>
      <p className="text-center text-[10px] font-bold text-slate-400">↓</p>
      <p
        className={cn(
          "rounded bg-emerald-50 px-2 py-1 font-mono font-medium text-emerald-900",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        {newValue || "—"}
      </p>
    </div>
  );
}

export const ActivityEventRow = memo(function ActivityEventRow({
  event,
  compact = false,
  showClause = true,
}: {
  event: EnrichedActivityEvent;
  compact?: boolean;
  showClause?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-3 shadow-sm",
        compact && "p-2.5"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white"
          title={event.userName}
        >
          {event.userInitials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <time className="text-xs font-medium text-slate-500">
              {formatActivityDate(event.date)}
            </time>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                getActivityTypeBadgeStyle(event.type)
              )}
            >
              {event.type.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">{event.userName}</p>
          <p className="mt-0.5 text-sm text-slate-700">{event.actionSummary}</p>
          {showClause ? (
            <p className="mt-1 text-xs font-medium text-primary-700">{event.clause}</p>
          ) : null}
          {event.insurer && event.insurer !== "—" ? (
            <p className="text-xs text-slate-500">{event.insurer}</p>
          ) : null}
          {(event.type === "FIELD_UPDATED" ||
            event.type.startsWith("BROKER_NOTE") ||
            event.type.startsWith("AI_OVERRIDE")) && (
            <ValueChange
              oldValue={event.old_value}
              newValue={event.new_value}
              compact={compact}
            />
          )}
          {(event.type === "CLAUSE_REVIEWED" ||
            event.type === "CLAUSE_UNREVIEWED" ||
            event.type === "CLAUSE_DELETED") && (
            <ValueChange
              oldValue={event.old_value}
              newValue={event.new_value}
              compact={compact}
            />
          )}
        </div>
      </div>
    </article>
  );
});
