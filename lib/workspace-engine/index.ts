/**
 * Workspace domain engine — pure business logic.
 * Consumed by web renderers, future mobile, export, AI copilots, approvals.
 */

export * from "./types";
export * from "./getSectionById";
export * from "./getClauseById";
export * from "./getClausesForSection";
export * from "./getInsurerColumns";
export * from "./buildComparisonMatrix";
export * from "./getRiskSummary";
export * from "./filterClauses";
export * from "./searchClauses";
export * from "./sortClauses";
export * from "./groupClauses";
export * from "./formatSourceTrace";
export * from "./resolveVisibleClauses";
