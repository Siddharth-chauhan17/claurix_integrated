/**
 * Human-in-the-loop QCR editing module.
 * Clause-centric comparisons — separate from AI WorkspaceResponse renderer pipeline.
 */

export * from "./types";
export * from "./status-styles";
export * from "./ai-mock-response";
export * from "./normalize-ai-response";
export * from "./mock-data";
export {
  clearPersistedQcrWorkspace,
  fetchQcrWorkspace,
  fetchQcrWorkspaceFromAiRaw,
  loadPersistedQcrWorkspace,
  saveQcrWorkspace,
} from "./mock-api";
export * from "./selectors";
export {
  useQcrEditingStore,
  selectVisibleClauses,
  selectHasUnsavedChanges,
  useVisibleClauses,
  useVisibleInsurers,
  type QcrEditingUiState,
  type QcrEditingDraftState,
  type QcrWorkspaceView,
} from "./workspace-store";
export * from "./activity-types";
export {
  useActivityStore,
} from "./activity-store";
export {
  useProjectActivityEvents,
  useClauseActivityEvents,
  filterActivityEventsByClause,
  enrichActivityEvent,
  formatActivityDate,
  type EnrichedActivityEvent,
} from "./activity-selectors";
export {
  createActivityEvent,
  logFieldUpdate,
  logBrokerNote,
  logOverrideApplied,
  logOverrideRemoved,
  logClauseReviewed,
  logClauseUnreviewed,
  logClauseDeleted,
} from "./activity-utils";
export { WORKSPACE_USERS, getWorkspaceUserName, registerAuthUser } from "./users";
