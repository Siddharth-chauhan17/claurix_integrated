/**
 * Immutable activity audit events for QCR editing workspace.
 * Schema is fixed — only user_id is stored; names resolved via users table.
 */

export type ActivityEvent = {
  id: string;
  project_id: string;
  date: string;
  user_id: string;
  type: string;
  clause: string;
  insurer: string;
  field: string;
  old_value: string;
  new_value: string;
};

export type ActivityEventType =
  | "FIELD_UPDATED"
  | "BROKER_NOTE_ADDED"
  | "BROKER_NOTE_UPDATED"
  | "AI_OVERRIDE_APPLIED"
  | "AI_OVERRIDE_REMOVED"
  | "CLAUSE_REVIEWED"
  | "CLAUSE_UNREVIEWED"
  | "CLAUSE_DELETED";

export const ACTIVITY_EVENT_TYPES: ActivityEventType[] = [
  "FIELD_UPDATED",
  "BROKER_NOTE_ADDED",
  "BROKER_NOTE_UPDATED",
  "AI_OVERRIDE_APPLIED",
  "AI_OVERRIDE_REMOVED",
  "CLAUSE_REVIEWED",
  "CLAUSE_UNREVIEWED",
  "CLAUSE_DELETED",
];

export type CreateActivityEventInput = {
  project_id: string;
  user_id: string;
  type: ActivityEventType;
  clause: string;
  insurer: string;
  field: string;
  old_value: string;
  new_value: string;
  date?: string;
  id?: string;
};
