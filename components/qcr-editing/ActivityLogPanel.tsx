"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useProjectActivityEvents } from "@/lib/qcr-editing/activity-selectors";
import type { EnrichedActivityEvent } from "@/lib/qcr-editing/activity-selectors";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";
import { ActivityEventRow } from "./ActivityEventRow";

function resolveClauseMatch(
  query: string,
  options: string[]
): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = options.find((c) => c.toLowerCase() === q);
  if (exact) return exact;
  const partial = options.find((c) => c.toLowerCase().includes(q));
  return partial ?? null;
}

const ActivityList = memo(function ActivityList({
  events,
  emptyMessage,
}: {
  events: EnrichedActivityEvent[];
  emptyMessage: string;
}) {
  if (events.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">{emptyMessage}</p>
    );
  }

  return (
    <ul className="space-y-3 p-4">
      {events.map((event) => (
        <li key={event.id}>
          <ActivityEventRow event={event} showClause />
        </li>
      ))}
    </ul>
  );
});

/** Full-project activity log with clause search. */
export function ActivityLogPanel() {
  const projectId = useQcrEditingStore((s) => s.workspace?.meta.project_id);
  const clauses = useQcrEditingStore((s) => s.clauses);
  const allEvents = useProjectActivityEvents(projectId);

  const [clauseQuery, setClauseQuery] = useState("");
  const [appliedClause, setAppliedClause] = useState<string | null>(null);

  const clauseOptions = useMemo(() => {
    const fromWorkspace = clauses.map((c) => c.rfq_clause);
    const fromEvents = allEvents.map((e) => e.clause);
    return Array.from(new Set([...fromWorkspace, ...fromEvents])).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [clauses, allEvents]);

  const displayedEvents = useMemo(() => {
    if (!appliedClause) return allEvents;
    return allEvents.filter((e) => e.clause === appliedClause);
  }, [allEvents, appliedClause]);

  const handleSearch = useCallback(() => {
    const match = resolveClauseMatch(clauseQuery, clauseOptions);
    setAppliedClause(match);
    if (match) setClauseQuery(match);
  }, [clauseQuery, clauseOptions]);

  const handleClear = useCallback(() => {
    setAppliedClause(null);
    setClauseQuery("");
  }, []);

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No project loaded.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50/50">
      <div className="shrink-0 space-y-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Activity log</h2>
          <p className="text-xs text-slate-500">
            Who did what and when — search by clause to filter
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <input
              type="search"
              list="activity-clause-options"
              value={clauseQuery}
              onChange={(e) => setClauseQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Search clause (e.g. Terrorism Cover)"
              className="w-full rounded-lg border border-slate-200 py-2 pl-3 pr-3 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
              aria-label="Search activity by clause"
            />
            <datalist id="activity-clause-options">
              {clauseOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            Search
          </button>
          {appliedClause ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          ) : null}
        </div>

        {appliedClause ? (
          <p className="text-xs text-slate-600">
            Showing{" "}
            <span className="font-semibold text-primary-700">{appliedClause}</span>
            {" · "}
            {displayedEvents.length} event
            {displayedEvents.length !== 1 ? "s" : ""}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            {allEvents.length} total events · newest first
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ActivityList
          events={displayedEvents}
          emptyMessage={
            appliedClause
              ? `No activity found for “${appliedClause}”.`
              : "No activity recorded for this project yet."
          }
        />
      </div>
    </div>
  );
}
