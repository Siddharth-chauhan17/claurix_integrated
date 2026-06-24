import type { ComparisonStatus, InsurerComparison, OverrideStatus } from "./types";
import { STATUS_LABELS } from "./status-styles";
import { useActivityStore } from "./activity-store";
import type {
  ActivityEvent,
  ActivityEventType,
  CreateActivityEventInput,
} from "./activity-types";

let eventCounter = 0;

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debouncedAppend(key: string, fn: () => void, ms = 700): void {
  const existing = debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      fn();
    }, ms)
  );
}

export function nextActivityEventId(): string {
  eventCounter += 1;
  return `evt_${Date.now()}_${eventCounter}`;
}

export function createActivityEvent(input: CreateActivityEventInput): ActivityEvent {
  return {
    id: input.id ?? nextActivityEventId(),
    project_id: input.project_id,
    date: input.date ?? new Date().toISOString(),
    user_id: input.user_id,
    type: input.type,
    clause: input.clause,
    insurer: input.insurer,
    field: input.field,
    old_value: input.old_value,
    new_value: input.new_value,
  };
}

export function formatFieldValue(
  field: string,
  value: string | number | boolean | string[] | ComparisonStatus | OverrideStatus
): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.length === 0 ? "None" : value.join("\n");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field === "status" || field === "override_status") {
    const key = String(value) as ComparisonStatus;
    return STATUS_LABELS[key] ?? String(value);
  }
  return String(value);
}

export type ActivityLogContext = {
  projectId: string;
  userId: string;
};

function append(ctx: ActivityLogContext, input: Omit<CreateActivityEventInput, "project_id" | "user_id">): ActivityEvent | null {
  const userId = ctx.userId || useActivityStore.getState().currentUserId;
  if (!userId || !ctx.projectId) return null;
  const event = createActivityEvent({
    ...input,
    project_id: ctx.projectId,
    user_id: userId,
  });
  useActivityStore.getState().appendEvent(event);
  return event;
}

const DEBOUNCED_TEXT_FIELDS = new Set([
  "proposal_clause",
  "broker_note",
  "broker_remark",
  "differences",
]);

export function logFieldUpdate(
  ctx: ActivityLogContext,
  clause: string,
  insurer: string,
  field: string,
  oldValue: string,
  newValue: string
): ActivityEvent | null {
  if (oldValue === newValue) return null;
  const run = () =>
    append(ctx, {
      type: "FIELD_UPDATED",
      clause,
      insurer,
      field,
      old_value: oldValue,
      new_value: newValue,
    });
  if (DEBOUNCED_TEXT_FIELDS.has(field)) {
    debouncedAppend(`${ctx.projectId}:${clause}:${insurer}:${field}`, run);
    return null;
  }
  return run();
}

export function logBrokerNote(
  ctx: ActivityLogContext,
  clause: string,
  insurer: string,
  oldNote: string,
  newNote: string
): ActivityEvent | null {
  if (oldNote === newNote) return null;
  const type: ActivityEventType =
    !oldNote.trim() && newNote.trim()
      ? "BROKER_NOTE_ADDED"
      : "BROKER_NOTE_UPDATED";
  const run = () =>
    append(ctx, {
      type,
      clause,
      insurer,
      field: "broker_note",
      old_value: oldNote || "—",
      new_value: newNote,
    });
  debouncedAppend(`${ctx.projectId}:${clause}:${insurer}:broker_note`, run);
  return null;
}

export function logOverrideApplied(
  ctx: ActivityLogContext,
  clause: string,
  insurer: string,
  oldOverride: OverrideStatus,
  newOverride: ComparisonStatus
): ActivityEvent | null {
  return append(ctx, {
    type: "AI_OVERRIDE_APPLIED",
    clause,
    insurer,
    field: "override_status",
    old_value: oldOverride ? formatFieldValue("override_status", oldOverride) : "None",
    new_value: formatFieldValue("override_status", newOverride),
  });
}

export function logOverrideRemoved(
  ctx: ActivityLogContext,
  clause: string,
  insurer: string,
  oldOverride: ComparisonStatus
): ActivityEvent | null {
  return append(ctx, {
    type: "AI_OVERRIDE_REMOVED",
    clause,
    insurer,
    field: "override_status",
    old_value: formatFieldValue("override_status", oldOverride),
    new_value: "None",
  });
}

export function logClauseReviewed(
  ctx: ActivityLogContext,
  clause: string,
  insurer: string
): ActivityEvent | null {
  return append(ctx, {
    type: "CLAUSE_REVIEWED",
    clause,
    insurer,
    field: "reviewed",
    old_value: "Not reviewed",
    new_value: "Reviewed",
  });
}

export function logClauseUnreviewed(
  ctx: ActivityLogContext,
  clause: string,
  insurer: string
): ActivityEvent | null {
  return append(ctx, {
    type: "CLAUSE_UNREVIEWED",
    clause,
    insurer,
    field: "reviewed",
    old_value: "Reviewed",
    new_value: "Not reviewed",
  });
}

export function logClauseDeleted(
  ctx: ActivityLogContext,
  clause: string
): ActivityEvent | null {
  return append(ctx, {
    type: "CLAUSE_DELETED",
    clause,
    insurer: "—",
    field: "clause",
    old_value: clause,
    new_value: "Removed from comparison",
  });
}

/** Log all changed fields on an insurer comparison patch. */
export function logInsurerComparisonChanges(
  ctx: ActivityLogContext,
  clauseName: string,
  insurer: string,
  before: InsurerComparison,
  patch: Partial<InsurerComparison>
): void {
  if (patch.proposal_clause !== undefined && patch.proposal_clause !== before.proposal_clause) {
    logFieldUpdate(
      ctx,
      clauseName,
      insurer,
      "proposal_clause",
      before.proposal_clause,
      patch.proposal_clause
    );
  }
  if (patch.status !== undefined && patch.status !== before.status) {
    logFieldUpdate(
      ctx,
      clauseName,
      insurer,
      "status",
      formatFieldValue("status", before.status),
      formatFieldValue("status", patch.status)
    );
  }
  if (patch.gap_score !== undefined && patch.gap_score !== before.gap_score) {
    logFieldUpdate(
      ctx,
      clauseName,
      insurer,
      "gap_score",
      String(before.gap_score),
      String(patch.gap_score)
    );
  }
  if (patch.differences !== undefined) {
    const oldDiff = formatFieldValue("differences", before.differences);
    const newDiff = formatFieldValue("differences", patch.differences);
    if (oldDiff !== newDiff) {
      logFieldUpdate(ctx, clauseName, insurer, "differences", oldDiff, newDiff);
    }
  }
  if (patch.broker_note !== undefined && patch.broker_note !== before.broker_note) {
    logBrokerNote(ctx, clauseName, insurer, before.broker_note, patch.broker_note);
  }
  if (patch.override_status !== undefined && patch.override_status !== before.override_status) {
    if (patch.override_status === null && before.override_status !== null) {
      logOverrideRemoved(ctx, clauseName, insurer, before.override_status);
    } else if (patch.override_status !== null) {
      logOverrideApplied(
        ctx,
        clauseName,
        insurer,
        before.override_status,
        patch.override_status
      );
    }
  }
  if (patch.reviewed !== undefined && patch.reviewed !== before.reviewed) {
    if (patch.reviewed) {
      logClauseReviewed(ctx, clauseName, insurer);
    } else {
      logClauseUnreviewed(ctx, clauseName, insurer);
    }
  }
}

export function getActivityContext(
  projectId: string | undefined,
  userId: string | null | undefined
): ActivityLogContext | null {
  if (!projectId || !userId) return null;
  return { projectId, userId };
}
