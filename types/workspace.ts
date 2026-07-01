/**
 * Canonical QCR workspace domain contracts (renderer-agnostic).
 * Shared by web, future mobile, PDF/Excel export, and approval workflows.
 * No UI, AG Grid, or layout metadata — semantic insurance objects only.
 */

export const WORKSPACE_SCHEMA_VERSION = "1.0" as const;

export type WorkspaceSchemaVersion = typeof WORKSPACE_SCHEMA_VERSION;

/** How a source document is classified for orchestration. */
export type DocumentType = "rfq" | "quote" | "policy" | "endorsement" | "other";

export type SourceType =
  | "spreadsheet"
  | "pdf"
  | "word"
  | "email"
  | "image"
  | "unknown";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ClauseCategory =
  | "financial"
  | "coverage"
  | "exclusion"
  | "limit"
  | "deductible"
  | "warranty"
  | "general"
  | "other";

export type ComparisonType =
  | "numeric"
  | "text"
  | "boolean"
  | "date"
  | "list"
  | "structured";

/** Region within a source document (sheet rows, PDF pages, etc.). */
export type SourceLocation = {
  sheet_name?: string | null;
  row_start?: number | null;
  row_end?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  column_start?: string | null;
  column_end?: string | null;
  /** Opaque anchor for future formats (email thread id, bbox id, etc.). */
  anchor_id?: string | null;
};

export type SourceReference = {
  source_type: SourceType;
  location: SourceLocation;
  /** Human-readable hint for auditors; not used for rendering. */
  label?: string | null;
};

/** Links a policy section to a segment of an uploaded document. */
export type SectionSourceMapping = {
  document_id: string;
  source_reference: SourceReference;
};

export type DocumentDescriptor = {
  document_id: string;
  file_name: string;
  document_type: DocumentType;
  uploaded_at?: string | null;
  mime_type?: string | null;
  /** Server-stored document id for quote/rfq files used by gap analysis. */
  server_document_id?: string | null;
};

/** User-selected policy section sent to the AI orchestration layer. */
export type SelectedPolicySection = {
  section_id: string;
  section_name: string;
  source_mappings: SectionSourceMapping[];
};

export type WorkspaceMetadata = {
  project_name?: string | null;
  client_name?: string | null;
  generated_by?: "mock" | "cofounder_ai" | string;
  mapping_count?: number;
  document_count?: number;
};

/**
 * Request body for POST /projects/{projectId}/generate-qcr.
 * JSON is the canonical input to orchestration (not Excel binaries).
 */
export type WorkspacePayload = {
  project_id: string;
  schema_version: WorkspaceSchemaVersion;
  documents: DocumentDescriptor[];
  selected_sections: SelectedPolicySection[];
  metadata?: WorkspaceMetadata | null;
};

export type InsurerValue = {
  insurer: string;
  value: string;
  /** Optional stable id for future collaboration / audit. */
  value_id?: string | null;
};

export type AIAnalysis = {
  summary: string;
  risk_level: RiskLevel;
  recommendation: string;
  confidence?: number | null;
};

export type Comment = {
  comment_id: string;
  author?: string | null;
  body: string;
  created_at: string;
};

/** Traceability back to user-defined source segmentation (response mirror of mappings). */
export type SourceTrace = {
  document_id: string;
  source_type: SourceType;
  sheet_name?: string | null;
  row_start?: number | null;
  row_end?: number | null;
  page_start?: number | null;
  page_end?: number | null;
};

export type Clause = {
  clause_id: string;
  title: string;
  category: ClauseCategory;
  comparison_type: ComparisonType;
  editable: boolean;
  values: InsurerValue[];
  ai_analysis: AIAnalysis;
  comments: Comment[];
};

/** Policy section block inside generated workspace (AI output). */
export type PolicySection = {
  section_id: string;
  section_name: string;
  source_trace: SourceTrace[];
  clauses: Clause[];
};

/**
 * Response from orchestration — semantic workspace state only.
 * Replace mock_qcr_generator with real AI without changing this contract.
 */
export type WorkspaceResponse = {
  workspace_id: string;
  project_id: string;
  schema_version: WorkspaceSchemaVersion;
  generated_at: string;
  metadata: WorkspaceMetadata;
  sections: PolicySection[];
};

export type GenerateQcrResult = {
  payload: WorkspacePayload;
  response: WorkspaceResponse;
};
