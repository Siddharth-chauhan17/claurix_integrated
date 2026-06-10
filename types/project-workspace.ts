/** Isolated project workspace types — frontend-only until AI phase. */

export type WorkflowStageId =
  | "document-upload"
  | "workstation"
  | "rfq-upload"
  | "quote-uploads"
  | "policy-mapping"
  | "ai-processing"
  | "review-edit"
  | "export-qcr"
  | "activity";

export type SheetRow = Record<string, unknown> & { _rowIndex: number };

export type ParsedSheet = {
  name: string;
  columns: string[];
  rows: SheetRow[];
};

export type RfqWorkbook = {
  fileName: string;
  sheets: ParsedSheet[];
  uploadedAt: string;
  /** Server-side document id after Phase 1 dual-write upload. */
  serverDocumentId?: string;
};

export type QuoteFileRef = {
  id: string;
  name: string;
  uploadedAt: string;
  /** Server-side document id after Phase 1 dual-write upload. */
  serverDocumentId?: string;
};

export type PolicyMapping = {
  id: string;
  sheet_name: string;
  start_row: number;
  end_row: number;
  policy_line: string;
  color: string;
};

export type RowSelectionRange = {
  start: number;
  end: number;
};

export type PersistedWorkspaceState = {
  currentStage: WorkflowStageId;
  sidebarCollapsed: boolean;
  rfqWorkbook: RfqWorkbook | null;
  quoteFiles: QuoteFileRef[];
  activeSheetName: string | null;
  mappings: PolicyMapping[];
};
