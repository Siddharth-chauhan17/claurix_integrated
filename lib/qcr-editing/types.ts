/**
 * Human-in-the-loop QCR editing contracts (framework-agnostic).
 *
 * Normalized model: one RFQ clause → many insurer comparisons.
 * Distinct from types/workspace.ts (AI orchestration / renderer shell).
 * Designed for future API + DB persistence without Excel row storage.
 */

/** Machine / AI alignment status before broker override. */
export type ComparisonStatus =
  | "agreed"
  | "partially_agreed"
  | "not_agreed"
  | "not_applicable"
  | "pending_review";

/** Broker may override AI status during review. */
export type OverrideStatus = ComparisonStatus | null;

/** Clause-level review workflow (V2 review panel). */
export type ClauseReviewStatus =
  | "not_reviewed"
  | "in_review"
  | "reviewed"
  | "escalated";

export const CLAUSE_REVIEW_STATUS_LABELS: Record<ClauseReviewStatus, string> = {
  not_reviewed: "Not Reviewed",
  in_review: "In Review",
  reviewed: "Reviewed",
  escalated: "Escalated",
};

export type QcrSectionId =
  | "property_damage"
  | "business_interruption"
  | "extensions"
  | "special_conditions";

export type QcrSection = {
  id: QcrSectionId;
  label: string;
};

/** Excel traceability for broker source verification (from AI model). */
export type ClauseSource = {
  file_name?: string;
  sheet_name: string;
  excel_row: number;
  clause_cell: string;
  requirement_cell: string;
  uw_remark_cell: string;
};

export const QCR_SECTIONS: QcrSection[] = [
  { id: "property_damage", label: "Property Damage" },
  { id: "business_interruption", label: "Business Interruption" },
  { id: "extensions", label: "Extensions" },
  { id: "special_conditions", label: "Special Conditions" },
];

export type InsurerComparison = {
  insurer: string;
  proposal_clause: string;
  status: ComparisonStatus;
  /** 0 = aligned with RFQ; higher = larger gap vs requirement. */
  gap_score: number;
  differences: string[];
  /** @deprecated V1 per-insurer note — use clause.broker_remark in V2. */
  broker_note: string;
  override_status: OverrideStatus;
  reviewed: boolean;
  /** AI-generated reasoning for broker review (V2). */
  ai_explanation: string;
};

/**
 * Workspace API unit — grouped by clause (not flat Excel rows).
 */
export type ClauseComparison = {
  clause_id: string;
  section_id: QcrSectionId;
  rfq_clause: string;
  rfq_requirement: string;
  /** Original RFQ Excel cell reference — used by Source verification UI. */
  source?: ClauseSource;
  /** Single broker conclusion for the whole clause (V2). */
  broker_remark: string;
  /** Recommended insurer name, or null / empty for no recommendation. */
  final_recommendation: string | null;
  review_status: ClauseReviewStatus;
  comparisons: InsurerComparison[];
};

export type QcrWorkspaceMeta = {
  project_id: string;
  project_name?: string;
  client_name?: string;
  rfq_file_name?: string;
  generated_at: string;
  schema_version: string;
};

/** Full workspace payload returned by the editing API. */
export type QcrWorkspace = {
  workspace_id: string;
  meta: QcrWorkspaceMeta;
  insurers: string[];
  clauses: ClauseComparison[];
};

/** Partial updates for inline editing (persistence-ready patches). */
export type InsurerComparisonPatch = Partial<
  Pick<
    InsurerComparison,
    | "proposal_clause"
    | "broker_note"
    | "override_status"
    | "status"
    | "gap_score"
    | "reviewed"
  >
> & {
  differences?: string[];
};

export type ClauseComparisonPatch = Partial<
  Pick<
    ClauseComparison,
    | "rfq_clause"
    | "rfq_requirement"
    | "broker_remark"
    | "final_recommendation"
    | "review_status"
  >
>;

/** Serializable snapshot for future save / audit. */
export type QcrWorkspacePersistPayload = {
  workspace_id: string;
  clauses: ClauseComparison[];
  saved_at: string;
  saved_by?: string;
};
