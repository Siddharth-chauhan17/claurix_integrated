/** Isolated project workspace types — frontend-only until AI phase. */

export type WorkflowStageId =
  | "document-upload"
  | "workstation"
  | "rfq-upload"
  | "quote-uploads"
  | "email"
  | "policy-mapping"
  | "ai-processing"
  | "review-edit"
  | "export-qcr"
  | "activity";

export type EmailWorkspaceTab = "inbox" | "drafts";

export type SheetRow = Record<string, unknown> & { _rowIndex: number };

/** Display + field metadata for a parsed RFQ column. */
export type SheetColumnMeta = {
  /** Stable key on SheetRow, e.g. `_c0`. */
  field: string;
  /** Excel column letter, e.g. `A`, `B`. */
  letter: string;
  /** Human label from detected header row or fallback. */
  label: string;
  /** Pin left in the mapping grid when true. */
  pinned?: boolean;
};

export type ParsedSheet = {
  name: string;
  /** Stable field keys on each SheetRow. */
  columns: string[];
  /** Rich column metadata (optional on legacy persisted workbooks). */
  columnMeta?: SheetColumnMeta[];
  /** 1-based Excel row index of detected header, if any. */
  headerRowIndex?: number | null;
  rows: SheetRow[];
};

export type RfqWorkbook = {
  fileName: string;
  sheets: ParsedSheet[];
  uploadedAt: string;
  /** Server-side document id after Phase 1 dual-write upload. */
  serverDocumentId?: string;
};

/** Archived RFQ entry (Uploaded RFQ sidebar). */
export type RfqFileRef = {
  id: string;
  workbook: RfqWorkbook;
  /** When the RFQ was moved to the archive (Uploaded RFQ). */
  archivedAt?: string;
};

export type QuoteFileRef = {
  id: string;
  name: string;
  uploadedAt: string;
  /** When the quote was moved to the archive (Uploaded Quotes). */
  archivedAt?: string;
  /** Server-side document id after Phase 1 dual-write upload. */
  serverDocumentId?: string;
};

export type QcrExportRef = {
  fileName: string;
  exportedAt: string;
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
  emailTab?: EmailWorkspaceTab;
  sidebarCollapsed: boolean;
  rfqWorkbook: RfqWorkbook | null;
  quoteFiles: QuoteFileRef[];
  /** Quotes removed from the active upload step; not used for QCR generation. */
  archivedQuoteFiles?: QuoteFileRef[];
  /** RFQs removed from the active upload step; not used for policy mapping / QCR. */
  archivedRfqFiles?: RfqFileRef[];
  activeSheetName: string | null;
  mappings: PolicyMapping[];
  qcrExport?: QcrExportRef | null;
};
