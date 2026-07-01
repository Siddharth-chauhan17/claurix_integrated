import { create } from "zustand";
import {
  deleteRfqBlob,
  deleteArchivedRfqBlob,
  loadArchivedRfqBlobsForProject,
  loadRfqBlob,
  saveArchivedRfqBlob,
  saveRfqBlob,
} from "@/lib/project-workspace/rfq-blob-storage";
import { loadQcrExportBlob } from "@/lib/project-workspace/qcr-export-storage";
import { downloadBlob } from "@/lib/project-workspace/downloadBlob";
import { policyLineColor } from "@/lib/project-workspace/policyLines";
import {
  clearRfqBlobMemoryCache,
  registerRfqBlobInMemory,
} from "@/lib/project-workspace/rfq-blob-access";
import {
  loadPersistedWorkspace,
  savePersistedWorkspace,
} from "@/lib/project-workspace/storage";
import { invalidateQcrGeneration } from "@/lib/workspace/qcr-generation-context";
import {
  deleteQuoteBlob,
  loadQuoteBlobsForProject,
  saveQuoteBlob,
} from "@/lib/project-workspace/quote-blob-storage";
import { ensureQuotesOnServer as syncMissingQuotesToServer } from "@/lib/project-workspace/sync-quotes-to-server";
import {
  reconcileQuoteServerDocumentIds,
  reconcileRfqServerDocumentId,
} from "@/lib/workspace/reconcile-server-documents";
import { deleteProjectDocument, getProjectRelatedEmails, listProjectEmailDrafts } from "@/lib/api";
import { clearClauseSourceValueCache } from "@/lib/qcr-editing/excel-source-lookup";
import {
  selectionConflictsWithMappings,
  rowInsideMapping,
} from "@/lib/workspace-interaction/mappingOverlap";
import {
  computeBeginSelection,
  computeExtendedRange,
  normalizeRange,
} from "@/lib/workspace-interaction/rowRangeSelection";
import type {
  PersistedWorkspaceState,
  PolicyMapping,
  QcrExportRef,
  QuoteFileRef,
  RfqFileRef,
  RfqWorkbook,
  RowSelectionRange,
  WorkflowStageId,
  EmailWorkspaceTab,
} from "@/types/project-workspace";

function newId(): string {
  return `map_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type AssignMenuState = {
  x: number;
  y: number;
  editingMappingId: string | null;
  /** Row used to position menu near selection (set by UI). */
  anchorRow?: number;
} | null;

type ProjectWorkspaceState = {
  projectId: string | null;
  projectName: string;
  clientName: string;
  clientId: string | null;
  currentStage: WorkflowStageId;
  emailTab: EmailWorkspaceTab;
  sidebarCollapsed: boolean;
  rfqWorkbook: RfqWorkbook | null;
  /**
   * Original RFQ file blob for exact Excel reads (Source verification) and download.
   * Also persisted in IndexedDB per projectId — restored by `restoreRfqFileBlob`.
   */
  rfqFileBlob: Blob | null;
  /** Active quotes for policy mapping and QCR generation (Upload documents step). */
  quoteFiles: QuoteFileRef[];
  archivedQuoteFiles: QuoteFileRef[];
  /** Archived RFQs removed from the active upload step. */
  archivedRfqFiles: RfqFileRef[];
  /** Original quote file blobs keyed by quote file id (session-only). */
  quoteFileBlobs: Record<string, Blob>;
  /** Archived RFQ file blobs keyed by archived RFQ id (session + IndexedDB). */
  archivedRfqFileBlobs: Record<string, Blob>;
  qcrExport: QcrExportRef | null;
  /** Latest exported QCR workbook blob (IndexedDB + in-memory when restored). */
  qcrExportBlob: Blob | null;
  activeSheetName: string | null;
  selectedRange: RowSelectionRange | null;
  mappings: PolicyMapping[];
  saveStatus: "saved" | "unsaved";
  isSelecting: boolean;
  selectionAnchor: number | null;
  /** fixed-start: drag from bottom edge; fixed-end: drag from top edge */
  selectionMode: "free" | "fixed-start" | "fixed-end";
  assignMenu: AssignMenuState;
  hoveredMappingId: string | null;
  activeMappingId: string | null;
  selectionNotice: string | null;
  hydrated: boolean;
  relatedEmailsCount: number;
  relatedEmailsDetailMessageId: string | null;
  emailDraftsCount: number;
  emailDraftsVersion: number;

  initProject: (meta: {
    projectId: string;
    projectName: string;
    clientName: string;
    clientId: string;
  }) => void;
  hydrate: (projectId: string) => void;
  reconcileServerDocuments: (projectId: string) => Promise<void>;
  /** Reload RFQ binary from IndexedDB after refresh/navigation (Source verification). */
  restoreRfqFileBlob: (projectId: string) => Promise<void>;
  /** Reload quote blobs from IndexedDB for server re-upload after refresh. */
  restoreQuoteFileBlobs: (projectId: string) => Promise<void>;
  /** Upload or reconcile any quotes missing server document IDs. */
  ensureQuotesOnServer: (projectId: string) => Promise<string | null>;
  persist: () => void;
  setStage: (stage: WorkflowStageId) => void;
  setEmailTab: (tab: EmailWorkspaceTab) => void;
  proceedToPolicyMapping: () => boolean;
  toggleSidebar: () => void;
  setRfqWorkbook: (workbook: RfqWorkbook, sourceFile: File) => void;
  /** Move active RFQ to Uploaded RFQ archive. */
  archiveRfqWorkbook: () => void;
  clearRfqWorkbook: () => void;
  setRfqServerDocumentId: (documentId: string) => void;
  addQuoteFiles: (files: File[]) => void;
  /** Move a quote from active upload list to Uploaded Quotes archive. */
  archiveQuoteFile: (id: string) => void;
  /** Restore an archived quote to the active upload list. */
  importArchivedQuoteFile: (id: string) => void;
  /** Permanently delete an archived quote (server + local). */
  deleteArchivedQuoteFile: (id: string) => Promise<void>;
  /** Restore an archived RFQ to the active upload slot. */
  importArchivedRfqFile: (id: string) => Promise<void>;
  /** Permanently delete an archived RFQ (server + local). */
  deleteArchivedRfqFile: (id: string) => Promise<void>;
  setQuoteServerDocumentId: (quoteFileId: string, documentId: string) => void;
  downloadRfqFile: () => void;
  downloadArchivedRfqFile: (id: string) => void;
  downloadQuoteFile: (id: string) => void;
  downloadArchivedQuoteFile: (id: string) => void;
  downloadQcrExport: () => void;
  restoreQcrExportBlob: (projectId: string) => Promise<void>;
  setActiveSheet: (name: string) => void;
  beginRowSelection: (rowIndex: number) => void;
  beginResizeSelection: (edge: "start" | "end") => void;
  extendRowSelection: (rowIndex: number) => void;
  /** End drag only — keeps selection visible, does not open assign menu. */
  finishRowSelection: () => void;
  openAssignMenuForSelection: (position: { x: number; y: number }) => void;
  setHoveredMapping: (id: string | null) => void;
  clearSelection: () => void;
  closeAssignMenu: () => void;
  assignPolicyToSelection: (policyLine: string) => void;
  /** Save row range for an existing mapping without changing policy line. */
  confirmMappingRange: () => void;
  removeMapping: (id: string) => void;
  openMappingEditor: (mappingId: string) => void;
  refreshRelatedEmailsCount: () => Promise<void>;
  refreshEmailDraftsCount: () => Promise<void>;
  bumpEmailDraftsVersion: () => void;
  setRelatedEmailsDetailMessageId: (messageId: string | null) => void;
};

function snapshot(state: ProjectWorkspaceState): PersistedWorkspaceState {
  return {
    currentStage: state.currentStage,
    emailTab: state.emailTab,
    sidebarCollapsed: state.sidebarCollapsed,
    rfqWorkbook: state.rfqWorkbook,
    quoteFiles: state.quoteFiles,
    archivedQuoteFiles: state.archivedQuoteFiles,
    archivedRfqFiles: state.archivedRfqFiles,
    activeSheetName: state.activeSheetName,
    mappings: state.mappings,
    qcrExport: state.qcrExport,
  };
}

function invalidateQcrIfProjectReady(get: () => ProjectWorkspaceState): void {
  const { projectId } = get();
  if (projectId) {
    invalidateQcrGeneration(projectId);
  }
}

export const useProjectWorkspaceStore = create<ProjectWorkspaceState>((set, get) => {
  function applySelectedRangeIfValid(range: RowSelectionRange): boolean {
    const { mappings, activeSheetName, activeMappingId } = get();
    if (
      selectionConflictsWithMappings(
        range,
        mappings,
        activeSheetName,
        activeMappingId
      )
    ) {
      set({
        selectionNotice:
          "Selection cannot overlap existing policy sections",
      });
      return false;
    }
    set({ selectedRange: range, selectionNotice: null });
    return true;
  }

  return {
  projectId: null,
  projectName: "",
  clientName: "",
  clientId: null,
  currentStage: "document-upload",
  emailTab: "inbox",
  sidebarCollapsed: false,
  rfqWorkbook: null,
  rfqFileBlob: null,
  quoteFiles: [],
  archivedQuoteFiles: [],
  archivedRfqFiles: [],
  quoteFileBlobs: {},
  archivedRfqFileBlobs: {},
  qcrExport: null,
  qcrExportBlob: null,
  activeSheetName: null,
  selectedRange: null,
  mappings: [],
  saveStatus: "saved",
  isSelecting: false,
  selectionAnchor: null,
  selectionMode: "free",
  assignMenu: null,
  hoveredMappingId: null,
  activeMappingId: null,
  selectionNotice: null,
  hydrated: false,
  relatedEmailsCount: 0,
  relatedEmailsDetailMessageId: null,
  emailDraftsCount: 0,
  emailDraftsVersion: 0,

  initProject: (meta) => {
    set({
      projectId: meta.projectId,
      projectName: meta.projectName,
      clientName: meta.clientName,
      clientId: meta.clientId,
      relatedEmailsCount: 0,
      relatedEmailsDetailMessageId: null,
      emailDraftsCount: 0,
      emailDraftsVersion: 0,
    });
    get().hydrate(meta.projectId);
    void get().refreshRelatedEmailsCount();
    void get().refreshEmailDraftsCount();
  },

  hydrate: (projectId) => {
    const saved = loadPersistedWorkspace(projectId);
    if (saved) {
      let stage = saved.currentStage as WorkflowStageId | "related-emails" | "email-drafts";
      let emailTab: EmailWorkspaceTab = saved.emailTab ?? "inbox";

      if (stage === "workstation") {
        stage = saved.rfqWorkbook ? "policy-mapping" : "document-upload";
      }
      if (stage === "policy-mapping" && !saved.rfqWorkbook) {
        stage = "document-upload";
      }
      if (stage === "related-emails") {
        stage = "email";
        emailTab = "inbox";
      }
      if (stage === "email-drafts") {
        stage = "email";
        emailTab = "drafts";
      }

      set({
        currentStage: stage,
        emailTab,
        sidebarCollapsed: saved.sidebarCollapsed,
        rfqWorkbook: saved.rfqWorkbook,
        // Blob is restored asynchronously from IndexedDB (see restoreRfqFileBlob).
        rfqFileBlob: null,
        quoteFiles: saved.quoteFiles,
        archivedQuoteFiles: saved.archivedQuoteFiles ?? [],
        archivedRfqFiles: saved.archivedRfqFiles ?? [],
        quoteFileBlobs: {},
        archivedRfqFileBlobs: {},
        qcrExport: saved.qcrExport ?? null,
        qcrExportBlob: null,
        activeSheetName: saved.activeSheetName,
        mappings: saved.mappings,
        saveStatus: "saved",
        hydrated: true,
      });
    } else {
      set({ hydrated: true, currentStage: "document-upload" });
    }
    void get().restoreRfqFileBlob(projectId);
    void get().restoreQcrExportBlob(projectId);
    void get()
      .restoreQuoteFileBlobs(projectId)
      .finally(() => {
        void get().restoreArchivedRfqFileBlobs(projectId);
        void get().reconcileServerDocuments(projectId);
      });
  },

  restoreArchivedRfqFileBlobs: async (projectId) => {
    try {
      const stored = await loadArchivedRfqBlobsForProject(projectId);
      if (stored.length === 0) return;
      set((s) => {
        const archivedRfqFileBlobs = { ...s.archivedRfqFileBlobs };
        for (const row of stored) {
          archivedRfqFileBlobs[row.rfqFileId] = row.blob;
        }
        return { archivedRfqFileBlobs };
      });
    } catch {
      /* IndexedDB unavailable */
    }
  },

  restoreQuoteFileBlobs: async (projectId) => {
    try {
      const stored = await loadQuoteBlobsForProject(projectId);
      if (stored.length === 0) return;
      set((s) => {
        const quoteFileBlobs = { ...s.quoteFileBlobs };
        for (const row of stored) {
          quoteFileBlobs[row.quoteFileId] = row.blob;
        }
        return { quoteFileBlobs };
      });
    } catch {
      /* IndexedDB unavailable */
    }
  },

  ensureQuotesOnServer: async (projectId) => {
    return syncMissingQuotesToServer(
      projectId,
      () => get().quoteFiles,
      () => get().quoteFileBlobs,
      get().setQuoteServerDocumentId
    );
  },

  reconcileServerDocuments: async (projectId) => {
    const { rfqWorkbook } = get();
    try {
      await reconcileRfqServerDocumentId(
        projectId,
        rfqWorkbook,
        get().setRfqServerDocumentId
      );
      await reconcileQuoteServerDocumentIds(
        projectId,
        get().quoteFiles,
        get().setQuoteServerDocumentId
      );
    } catch {
      /* Server unavailable — upload flow will surface errors */
    }
  },

  restoreQcrExportBlob: async (projectId) => {
    try {
      const stored = await loadQcrExportBlob(projectId);
      if (!stored?.blob) return;
      set({
        qcrExport: {
          fileName: stored.fileName,
          exportedAt: stored.exportedAt,
        },
        qcrExportBlob: stored.blob,
      });
    } catch {
      /* IndexedDB unavailable */
    }
  },

  restoreRfqFileBlob: async (projectId) => {
    try {
      const stored = await loadRfqBlob(projectId);
      if (!stored?.blob) return;
      registerRfqBlobInMemory(projectId, stored.blob);
      set({ rfqFileBlob: stored.blob });
    } catch {
      /* IndexedDB unavailable — parsed workbook fallback may still work */
    }
  },

  persist: () => {
    const state = get();
    if (!state.projectId) return;
    savePersistedWorkspace(state.projectId, snapshot(state));
    set({ saveStatus: "saved" });
  },

  setStage: (stage) => {
    const { rfqWorkbook } = get();
    if (stage === "policy-mapping" && !rfqWorkbook) {
      set({ currentStage: "document-upload" });
    } else {
      set({ currentStage: stage });
    }
    get().persist();
  },

  setEmailTab: (tab) => {
    set({ emailTab: tab });
    get().persist();
  },

  proceedToPolicyMapping: () => {
    const { rfqWorkbook, quoteFiles } = get();
    if (!rfqWorkbook) {
      set({
        selectionNotice: "Upload the RFQ Excel workbook before continuing.",
      });
      return false;
    }
    if (quoteFiles.length === 0) {
      set({
        selectionNotice: "Upload at least one carrier quote before continuing.",
      });
      return false;
    }
    set({
      currentStage: "policy-mapping",
      selectionNotice: null,
    });
    get().persist();
    return true;
  },

  toggleSidebar: () => {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
    get().persist();
  },

  setRfqWorkbook: (workbook, sourceFile) => {
    if (get().rfqWorkbook) {
      get().archiveRfqWorkbook();
    }
    const firstSheet = workbook.sheets[0]?.name ?? null;
    const projectId = get().projectId;
    if (projectId) {
      invalidateQcrGeneration(projectId);
    }
    set({
      rfqWorkbook: workbook,
      rfqFileBlob: sourceFile,
      activeSheetName: firstSheet,
      currentStage: "document-upload",
      mappings: [],
      activeMappingId: null,
      selectedRange: null,
      assignMenu: null,
      saveStatus: "unsaved",
      selectionNotice: null,
    });
    if (projectId) {
      registerRfqBlobInMemory(projectId, sourceFile);
      clearClauseSourceValueCache();
      void saveRfqBlob(projectId, sourceFile, workbook.fileName).catch(() => {
        /* non-fatal; in-memory blob still available this session */
      });
    }
    get().persist();
  },

  archiveRfqWorkbook: () => {
    const { projectId, rfqWorkbook, rfqFileBlob, mappings } = get();
    if (!rfqWorkbook) return;

    const id = newId();
    const archived: RfqFileRef = {
      id,
      workbook: rfqWorkbook,
      archivedAt: new Date().toISOString(),
    };
    const hadMappings = mappings.length > 0;
    const archivedRfqFileBlobs = { ...get().archivedRfqFileBlobs };
    if (rfqFileBlob) {
      archivedRfqFileBlobs[id] = rfqFileBlob;
    }

    if (projectId) {
      invalidateQcrGeneration(projectId);
    }

    set({
      rfqWorkbook: null,
      rfqFileBlob: null,
      activeSheetName: null,
      selectedRange: null,
      mappings: [],
      activeMappingId: null,
      assignMenu: null,
      hoveredMappingId: null,
      isSelecting: false,
      selectionAnchor: null,
      currentStage: "document-upload",
      archivedRfqFiles: [
        archived,
        ...get().archivedRfqFiles.filter((r) => r.id !== id),
      ],
      archivedRfqFileBlobs,
      saveStatus: "unsaved",
      selectionNotice: hadMappings
        ? `Moved "${rfqWorkbook.fileName}" to Uploaded RFQ — policy section mappings were cleared.`
        : `Moved "${rfqWorkbook.fileName}" to Uploaded RFQ.`,
    });

    if (projectId) {
      registerRfqBlobInMemory(projectId, null);
      clearRfqBlobMemoryCache(projectId);
      clearClauseSourceValueCache();
      void deleteRfqBlob(projectId).catch(() => {
        /* non-fatal */
      });
      if (rfqFileBlob) {
        void saveArchivedRfqBlob(projectId, id, rfqFileBlob, rfqWorkbook.fileName).catch(
          () => {
            /* non-fatal */
          }
        );
      }
    }

    get().persist();
  },

  clearRfqWorkbook: () => {
    const { projectId, mappings } = get();
    const hadMappings = mappings.length > 0;

    if (projectId) {
      invalidateQcrGeneration(projectId);
    }

    set({
      rfqWorkbook: null,
      rfqFileBlob: null,
      activeSheetName: null,
      selectedRange: null,
      mappings: [],
      activeMappingId: null,
      assignMenu: null,
      hoveredMappingId: null,
      isSelecting: false,
      selectionAnchor: null,
      currentStage: "document-upload",
      saveStatus: "unsaved",
      selectionNotice: hadMappings
        ? "RFQ removed — policy section mappings were cleared."
        : null,
    });

    if (projectId) {
      registerRfqBlobInMemory(projectId, null);
      clearRfqBlobMemoryCache(projectId);
      clearClauseSourceValueCache();
      void deleteRfqBlob(projectId).catch(() => {
        /* non-fatal */
      });
    }

    get().persist();
  },

  setRfqServerDocumentId: (documentId) => {
    const { rfqWorkbook } = get();
    if (!rfqWorkbook) return;
    set({
      rfqWorkbook: { ...rfqWorkbook, serverDocumentId: documentId },
      saveStatus: "unsaved",
    });
    get().persist();
  },

  addQuoteFiles: (files) => {
    const projectId = get().projectId;
    const additions: QuoteFileRef[] = files.map((f) => ({
      id: newId(),
      name: f.name,
      uploadedAt: new Date().toISOString(),
    }));
    set((s) => {
      const quoteFileBlobs = { ...s.quoteFileBlobs };
      additions.forEach((ref, index) => {
        quoteFileBlobs[ref.id] = files[index];
      });
      return {
        quoteFiles: [...s.quoteFiles, ...additions],
        quoteFileBlobs,
        saveStatus: "unsaved" as const,
      };
    });
    if (projectId) {
      invalidateQcrGeneration(projectId);
      for (let i = 0; i < additions.length; i += 1) {
        const ref = additions[i];
        const file = files[i];
        void saveQuoteBlob(projectId, ref.id, file, ref.name).catch(() => {
          /* non-fatal; in-memory blob still available this session */
        });
      }
    }
    get().persist();
  },

  archiveQuoteFile: (id) => {
    const projectId = get().projectId;
    const target = get().quoteFiles.find((q) => q.id === id);
    if (!target) return;

    set((s) => ({
      quoteFiles: s.quoteFiles.filter((q) => q.id !== id),
      archivedQuoteFiles: [
        { ...target, archivedAt: new Date().toISOString() },
        ...s.archivedQuoteFiles.filter((q) => q.id !== id),
      ],
      saveStatus: "unsaved" as const,
      selectionNotice:
        s.quoteFiles.length <= 1
          ? "All active quotes removed — upload at least one quote to continue."
          : `Moved "${target.name}" to Uploaded Quotes.`,
    }));

    if (projectId) {
      invalidateQcrGeneration(projectId);
    }
    get().persist();
  },

  importArchivedQuoteFile: (id) => {
    const projectId = get().projectId;
    const target = get().archivedQuoteFiles.find((q) => q.id === id);
    if (!target) return;

    const { archivedAt: _archivedAt, ...activeQuote } = target;

    set((s) => ({
      quoteFiles: [...s.quoteFiles.filter((q) => q.id !== id), activeQuote],
      archivedQuoteFiles: s.archivedQuoteFiles.filter((q) => q.id !== id),
      saveStatus: "unsaved" as const,
      selectionNotice: `Imported "${target.name}" as active quote.`,
    }));

    if (projectId) {
      invalidateQcrGeneration(projectId);
    }
    get().persist();
  },

  deleteArchivedQuoteFile: async (id) => {
    const projectId = get().projectId;
    const target = get().archivedQuoteFiles.find((q) => q.id === id);
    if (!target) return;

    if (projectId && target.serverDocumentId) {
      try {
        await deleteProjectDocument(projectId, target.serverDocumentId);
      } catch {
        /* still remove locally if server already gone */
      }
    }

    set((s) => {
      const quoteFileBlobs = { ...s.quoteFileBlobs };
      delete quoteFileBlobs[id];
      return {
        archivedQuoteFiles: s.archivedQuoteFiles.filter((q) => q.id !== id),
        quoteFileBlobs,
        saveStatus: "unsaved" as const,
      };
    });

    if (projectId) {
      void deleteQuoteBlob(projectId, id).catch(() => {
        /* non-fatal */
      });
    }
    get().persist();
  },

  importArchivedRfqFile: async (id) => {
    const projectId = get().projectId;
    const target = get().archivedRfqFiles.find((r) => r.id === id);
    if (!target) return;

    if (get().rfqWorkbook) {
      get().archiveRfqWorkbook();
    }

    const fresh = get();
    const archived = fresh.archivedRfqFiles.find((r) => r.id === id);
    if (!archived) return;

    let blob = fresh.archivedRfqFileBlobs[id] ?? null;
    if (!blob && projectId) {
      const stored = (await loadArchivedRfqBlobsForProject(projectId)).find(
        (row) => row.rfqFileId === id
      );
      blob = stored?.blob ?? null;
    }
    if (!blob) {
      set({
        selectionNotice:
          "Could not load this RFQ file — download it and re-upload from Upload documents.",
      });
      return;
    }

    const workbook = archived.workbook;
    const firstSheet = workbook.sheets[0]?.name ?? null;
    const archivedRfqFileBlobs = { ...fresh.archivedRfqFileBlobs };
    delete archivedRfqFileBlobs[id];

    if (projectId) {
      invalidateQcrGeneration(projectId);
    }

    set({
      rfqWorkbook: workbook,
      rfqFileBlob: blob,
      activeSheetName: firstSheet,
      archivedRfqFiles: fresh.archivedRfqFiles.filter((r) => r.id !== id),
      archivedRfqFileBlobs,
      currentStage: "document-upload",
      mappings: [],
      activeMappingId: null,
      selectedRange: null,
      assignMenu: null,
      saveStatus: "unsaved",
      selectionNotice: `Imported "${workbook.fileName}" as active RFQ.`,
    });

    if (projectId) {
      registerRfqBlobInMemory(projectId, blob);
      clearClauseSourceValueCache();
      void saveRfqBlob(projectId, blob, workbook.fileName).catch(() => {
        /* non-fatal */
      });
      void deleteArchivedRfqBlob(projectId, id).catch(() => {
        /* non-fatal */
      });
    }
    get().persist();
  },

  deleteArchivedRfqFile: async (id) => {
    const projectId = get().projectId;
    const target = get().archivedRfqFiles.find((r) => r.id === id);
    if (!target) return;

    if (projectId && target.workbook.serverDocumentId) {
      try {
        await deleteProjectDocument(projectId, target.workbook.serverDocumentId);
      } catch {
        /* still remove locally if server already gone */
      }
    }

    set((s) => {
      const archivedRfqFileBlobs = { ...s.archivedRfqFileBlobs };
      delete archivedRfqFileBlobs[id];
      return {
        archivedRfqFiles: s.archivedRfqFiles.filter((r) => r.id !== id),
        archivedRfqFileBlobs,
        saveStatus: "unsaved" as const,
      };
    });

    if (projectId) {
      void deleteArchivedRfqBlob(projectId, id).catch(() => {
        /* non-fatal */
      });
    }
    get().persist();
  },

  setQuoteServerDocumentId: (quoteFileId, documentId) => {
    set((s) => ({
      quoteFiles: s.quoteFiles.map((q) =>
        q.id === quoteFileId ? { ...q, serverDocumentId: documentId } : q
      ),
      saveStatus: "unsaved" as const,
    }));
    get().persist();
  },

  downloadRfqFile: () => {
    const { rfqWorkbook, rfqFileBlob } = get();
    if (!rfqWorkbook || !rfqFileBlob) return;
    downloadBlob(rfqFileBlob, rfqWorkbook.fileName);
  },

  downloadArchivedRfqFile: (id) => {
    const { archivedRfqFiles, archivedRfqFileBlobs } = get();
    const meta = archivedRfqFiles.find((f) => f.id === id);
    const blob = archivedRfqFileBlobs[id];
    if (!meta || !blob) return;
    downloadBlob(blob, meta.workbook.fileName);
  },

  downloadQuoteFile: (id) => {
    const { quoteFiles, quoteFileBlobs } = get();
    const meta = quoteFiles.find((f) => f.id === id);
    const blob = quoteFileBlobs[id];
    if (!meta || !blob) return;
    downloadBlob(blob, meta.name);
  },

  downloadArchivedQuoteFile: (id) => {
    const { archivedQuoteFiles, quoteFileBlobs } = get();
    const meta = archivedQuoteFiles.find((f) => f.id === id);
    const blob = quoteFileBlobs[id];
    if (!meta || !blob) return;
    downloadBlob(blob, meta.name);
  },

  downloadQcrExport: () => {
    const { qcrExport, qcrExportBlob } = get();
    if (!qcrExport || !qcrExportBlob) return;
    downloadBlob(qcrExportBlob, qcrExport.fileName);
  },

  setActiveSheet: (name) => {
    set({
      activeSheetName: name,
      selectedRange: null,
      assignMenu: null,
      hoveredMappingId: null,
      activeMappingId: null,
    });
    get().persist();
  },

  beginRowSelection: (rowIndex) => {
    const { selectedRange, mappings, activeSheetName, activeMappingId } = get();

    if (rowInsideMapping(rowIndex, mappings, activeSheetName, activeMappingId)) {
      return;
    }

    const begin = computeBeginSelection(rowIndex, selectedRange);
    if (
      selectionConflictsWithMappings(
        begin.range,
        mappings,
        activeSheetName,
        activeMappingId
      )
    ) {
      set({
        selectionNotice:
          "Selection cannot overlap existing policy sections",
      });
      return;
    }

    set({
      isSelecting: true,
      selectionAnchor: begin.anchor,
      selectionMode: begin.mode,
      selectedRange: begin.range,
      assignMenu: null,
      activeMappingId: null,
      selectionNotice: null,
    });
  },

  beginResizeSelection: (edge) => {
    const { selectedRange } = get();
    if (!selectedRange) return;
    const range = normalizeRange(selectedRange.start, selectedRange.end);

    if (edge === "start") {
      set({
        isSelecting: true,
        selectionAnchor: range.end,
        selectionMode: "fixed-end",
        selectedRange: range,
        assignMenu: null,
      });
      return;
    }

    set({
      isSelecting: true,
      selectionAnchor: range.start,
      selectionMode: "fixed-start",
      selectedRange: range,
      assignMenu: null,
    });
  },

  extendRowSelection: (rowIndex) => {
    const { isSelecting, selectionAnchor, selectionMode } = get();
    if (!isSelecting || selectionAnchor === null) return;
    const next = computeExtendedRange(rowIndex, selectionAnchor, selectionMode);
    applySelectedRangeIfValid(next);
  },

  finishRowSelection: () => {
    const { selectedRange, activeMappingId, mappings, activeSheetName } = get();

    if (
      selectedRange &&
      selectionConflictsWithMappings(
        selectedRange,
        mappings,
        activeSheetName,
        activeMappingId
      )
    ) {
      if (activeMappingId) {
        const mapping = mappings.find((m) => m.id === activeMappingId);
        if (mapping) {
          set({
            selectedRange: {
              start: mapping.start_row,
              end: mapping.end_row,
            },
            isSelecting: false,
            selectionAnchor: null,
            selectionMode: "free",
            assignMenu: null,
            selectionNotice:
              "Selection cannot overlap existing policy sections",
          });
          return;
        }
      }
      set({
        selectedRange: null,
        isSelecting: false,
        selectionAnchor: null,
        selectionMode: "free",
        assignMenu: null,
        activeMappingId: null,
        selectionNotice:
          "Selection cannot overlap existing policy sections",
      });
      return;
    }

    set({
      isSelecting: false,
      selectionAnchor: null,
      selectionMode: "free",
      assignMenu: null,
      selectionNotice: null,
    });
  },

  openAssignMenuForSelection: (position) => {
    const { selectedRange, activeMappingId, mappings, activeSheetName } = get();
    if (!selectedRange) return;
    if (
      selectionConflictsWithMappings(
        selectedRange,
        mappings,
        activeSheetName,
        activeMappingId
      )
    ) {
      set({
        selectionNotice:
          "Selection cannot overlap existing policy sections",
      });
      return;
    }
    set({
      assignMenu: {
        x: position.x,
        y: position.y,
        editingMappingId: activeMappingId,
      },
    });
  },

  setHoveredMapping: (id) => {
    if (get().hoveredMappingId === id) return;
    set({ hoveredMappingId: id });
  },

  clearSelection: () => {
    set({
      selectedRange: null,
      assignMenu: null,
      isSelecting: false,
      selectionAnchor: null,
      selectionMode: "free",
      activeMappingId: null,
      selectionNotice: null,
    });
  },

  closeAssignMenu: () => {
    set({ assignMenu: null });
  },

  assignPolicyToSelection: (policyLine) => {
    const { selectedRange, activeSheetName, assignMenu, mappings } = get();
    if (!selectedRange || !activeSheetName) return;

    const color = policyLineColor(policyLine);
    const range = normalizeRange(selectedRange.start, selectedRange.end);
    const ignoreId = assignMenu?.editingMappingId ?? null;
    if (
      selectionConflictsWithMappings(
        range,
        mappings,
        activeSheetName,
        ignoreId
      )
    ) {
      set({
        selectionNotice:
          "Selection cannot overlap existing policy sections",
      });
      return;
    }

    if (assignMenu?.editingMappingId) {
      const updated = mappings.map((m) =>
        m.id === assignMenu.editingMappingId
          ? { ...m, policy_line: policyLine, color, start_row: range.start, end_row: range.end }
          : m
      );
      set({
        mappings: updated,
        assignMenu: null,
        selectedRange: null,
        activeMappingId: null,
        saveStatus: "unsaved",
      });
    } else {
      const mapping: PolicyMapping = {
        id: newId(),
        sheet_name: activeSheetName,
        start_row: range.start,
        end_row: range.end,
        policy_line: policyLine,
        color,
      };
      set({
        mappings: [...mappings, mapping],
        assignMenu: null,
        selectedRange: null,
        activeMappingId: null,
        saveStatus: "unsaved",
      });
    }
    get().persist();
    invalidateQcrIfProjectReady(get);
  },

  confirmMappingRange: () => {
    const { selectedRange, activeMappingId, mappings, activeSheetName } = get();
    if (!selectedRange || !activeMappingId) return;

    const range = normalizeRange(selectedRange.start, selectedRange.end);
    if (
      selectionConflictsWithMappings(
        range,
        mappings,
        activeSheetName,
        activeMappingId
      )
    ) {
      set({
        selectionNotice:
          "Selection cannot overlap existing policy sections",
      });
      return;
    }
    const updated = mappings.map((m) =>
      m.id === activeMappingId
        ? { ...m, start_row: range.start, end_row: range.end }
        : m
    );

    set({
      mappings: updated,
      selectedRange: null,
      activeMappingId: null,
      assignMenu: null,
      isSelecting: false,
      selectionAnchor: null,
      selectionMode: "free",
      selectionNotice: null,
      saveStatus: "unsaved",
    });
    get().persist();
    invalidateQcrIfProjectReady(get);
  },

  removeMapping: (id) => {
    set((s) => ({
      mappings: s.mappings.filter((m) => m.id !== id),
      assignMenu: null,
      activeMappingId: null,
      selectedRange: null,
      saveStatus: "unsaved",
    }));
    get().persist();
    invalidateQcrIfProjectReady(get);
  },

  openMappingEditor: (mappingId) => {
    const mapping = get().mappings.find((m) => m.id === mappingId);
    if (!mapping) return;
    set({
      selectedRange: { start: mapping.start_row, end: mapping.end_row },
      activeSheetName: mapping.sheet_name,
      activeMappingId: mappingId,
      assignMenu: null,
      isSelecting: false,
      selectionNotice: null,
    });
  },

  refreshRelatedEmailsCount: async () => {
    const { projectId } = get();
    if (!projectId) return;
    try {
      const { messages } = await getProjectRelatedEmails(projectId);
      set({ relatedEmailsCount: messages.length });
    } catch {
      /* Outlook may be disconnected — badge stays at last value or 0 */
    }
  },

  refreshEmailDraftsCount: async () => {
    const { projectId } = get();
    if (!projectId) return;
    try {
      const { count } = await listProjectEmailDrafts(projectId);
      set({ emailDraftsCount: count });
    } catch {
      /* ignore */
    }
  },

  bumpEmailDraftsVersion: () => {
    set((s) => ({ emailDraftsVersion: s.emailDraftsVersion + 1 }));
    void get().refreshEmailDraftsCount();
  },

  setRelatedEmailsDetailMessageId: (messageId) => {
    set({ relatedEmailsDetailMessageId: messageId });
  },
};
});

export function getActiveSheetRows() {
  const { rfqWorkbook, activeSheetName } = useProjectWorkspaceStore.getState();
  if (!rfqWorkbook || !activeSheetName) return { columns: [] as string[], rows: [] };
  const sheet = rfqWorkbook.sheets.find((s) => s.name === activeSheetName);
  return sheet ?? { columns: [], rows: [] };
}
