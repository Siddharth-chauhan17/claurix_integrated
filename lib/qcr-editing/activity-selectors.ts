import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { ActivityEvent, ActivityEventType } from "./activity-types";
import { useActivityStore } from "./activity-store";
import { getUserInitials, getWorkspaceUserName } from "./users";

export type EnrichedActivityEvent = ActivityEvent & {
  userName: string;
  userInitials: string;
  actionSummary: string;
  fieldLabel: string;
};

const FIELD_LABELS: Record<string, string> = {
  proposal_clause: "Proposal",
  status: "Status",
  gap_score: "Gap score",
  differences: "Differences",
  broker_note: "Broker note",
  broker_remark: "Broker remark",
  override_status: "Override",
  reviewed: "Review",
};

const TYPE_ACTION_SUMMARY: Record<ActivityEventType, string> = {
  FIELD_UPDATED: "Changed",
  BROKER_NOTE_ADDED: "Added broker note",
  BROKER_NOTE_UPDATED: "Updated broker note",
  AI_OVERRIDE_APPLIED: "Applied AI override",
  AI_OVERRIDE_REMOVED: "Removed AI override",
  CLAUSE_REVIEWED: "Marked reviewed",
  CLAUSE_UNREVIEWED: "Marked not reviewed",
  CLAUSE_DELETED: "Deleted clause row",
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}

export function getActionSummary(event: ActivityEvent): string {
  const type = event.type as ActivityEventType;
  const prefix = TYPE_ACTION_SUMMARY[type] ?? event.type;
  if (type === "FIELD_UPDATED") {
    return `${prefix} ${getFieldLabel(event.field)}`;
  }
  return prefix;
}

export function enrichActivityEvent(event: ActivityEvent): EnrichedActivityEvent {
  const userName = getWorkspaceUserName(event.user_id);
  return {
    ...event,
    userName,
    userInitials: getUserInitials(userName),
    actionSummary: getActionSummary(event),
    fieldLabel: getFieldLabel(event.field),
  };
}

export function enrichActivityEvents(
  events: readonly ActivityEvent[]
): EnrichedActivityEvent[] {
  return events.map(enrichActivityEvent);
}

export function selectProjectActivityEvents(
  projectId: string | undefined
): readonly ActivityEvent[] {
  if (!projectId) return [];
  return useActivityStore.getState().getProjectEvents(projectId);
}

export function selectClauseActivityEvents(
  projectId: string | undefined,
  clauseName: string | undefined
): readonly ActivityEvent[] {
  if (!projectId || !clauseName) return [];
  return selectProjectActivityEvents(projectId).filter((e) => e.clause === clauseName);
}

export function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Subscribe only to one project's events (isolated from workspace store). */
export function useProjectActivityEvents(projectId: string | undefined): EnrichedActivityEvent[] {
  const events = useActivityStore(
    useShallow((s) => (projectId ? s.eventsByProject[projectId] ?? [] : []))
  );
  return useMemo(() => enrichActivityEvents(events), [events]);
}

/** Filter enriched events by exact clause name (for activity log search). */
export function filterActivityEventsByClause(
  events: EnrichedActivityEvent[],
  clauseName: string | null | undefined
): EnrichedActivityEvent[] {
  if (!clauseName?.trim()) return events;
  return events.filter((e) => e.clause === clauseName);
}

/** Clause-scoped history — memoized filter. */
export function useClauseActivityEvents(
  projectId: string | undefined,
  clauseName: string | undefined
): EnrichedActivityEvent[] {
  const events = useProjectActivityEvents(projectId);
  return useMemo(
    () => filterActivityEventsByClause(events, clauseName),
    [events, clauseName]
  );
}

export function getActivityTypeBadgeStyle(type: string): string {
  switch (type) {
    case "FIELD_UPDATED":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "BROKER_NOTE_ADDED":
    case "BROKER_NOTE_UPDATED":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "AI_OVERRIDE_APPLIED":
    case "AI_OVERRIDE_REMOVED":
      return "bg-violet-50 text-violet-800 ring-violet-200";
    case "CLAUSE_REVIEWED":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "CLAUSE_UNREVIEWED":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "CLAUSE_DELETED":
      return "bg-red-50 text-red-800 ring-red-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}
