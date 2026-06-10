import { create } from "zustand";
import { downloadBlob } from "@/lib/project-workspace/downloadBlob";
import { policyLineColor } from "@/lib/project-workspace/policyLines";
import { registerRfqBlobInMemory } from "@/lib/project-workspace/rfq-blob-access";
import {
  loadRfqBlob,
  saveRfqBlob,
} from "@/lib/project-workspace/rfq-blob-storage";
import {
  loadPersistedWorkspace,
  savePersistedWorkspace,
} from "@/lib/project-workspace/storage";
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
  QuoteFileRef,
  RfqWorkbook,
  RowSelectionRange,
  WorkflowStageId,
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
  sidebarCollapsed: boolean;
  rfqWorkbook: RfqWorkbook | null;
  /**
   * Original RFQ file blob for exact Excel reads (Source verification) and download.
   * Also persisted in IndexedDB per projectId — restored by `restoreRfqFileBlob`.
   */
  rfqFileBlob: Blob | null;
  quoteFiles: QuoteFileRef[];
  /** Original quote file blobs keyed by quote file id (session-only). */
  quoteFileBlobs: Record<string, Blob>;
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

  initProject: (meta: {
    projectId: string;
    projectName: string;
    clientName: string;
    clientId: string;
  }) => void;
  hydrate: (projectId: string) => void;
  /** Reload RFQ binary from IndexedDB after refresh/navigation (Source verification). */
  restoreRfqFileBlob: (projectId: string) => Promise<void>;
  persist: () => void;
  setStage: (stage: WorkflowStageId) => void;
  proceedToPolicyMapping: () => boolean;
  toggleSidebar: () => void;
  setRfqWorkbook: (workbook: RfqWorkbook, sourceFile: File) => void;
  setRfqServerDocumentId: (documentId: string) => void;
  addQuoteFiles: (files: File[]) => void;
  setQuoteServerDocumentId: (quoteFileId: string, documentId: string) => void;
  downloadRfqFile: () => void;
  downloadQuoteFile: (id: string) => void;
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
};

function snapshot(state: ProjectWorkspaceState): PersistedWorkspaceState {
  return {
    currentStage: state.currentStage,
    sidebarCollapsed: state.sidebarCollapsed,
    rfqWorkbook: state.rfqWorkbook,
    quoteFiles: state.quoteFiles,
    activeSheetName: state.activeSheetName,
    mappings: state.mappings,
  };
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
  sidebarCollapsed: false,
  rfqWorkbook: null,
  rfqFileBlob: null,
  quoteFiles: [],
  quoteFileBlobs: {},
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

  initProject: (meta) => {
    set({
      projectId: meta.projectId,
      projectName: meta.projectName,
      clientName: meta.clientName,
      clientId: meta.clientId,
    });
    get().hydrate(meta.projectId);
  },

  hydrate: (projectId) => {
    const saved = loadPersistedWorkspace(projectId);
    if (saved) {
      let stage = saved.currentStage;
      if (stage === "workstation") {
        stage = saved.rfqWorkbook ? "policy-mapping" : "document-upload";
      }
      if (stage === "policy-mapping" && !saved.rfqWorkbook) {
        stage = "document-upload";
      }
      set({
        currentStage: stage,
        sidebarCollapsed: saved.sidebarCollapsed,
        rfqWorkbook: saved.rfqWorkbook,
        // Blob is restored asynchronously from IndexedDB (see restoreRfqFileBlob).
        rfqFileBlob: null,
        quoteFiles: saved.quoteFiles,
        quoteFileBlobs: {},
        activeSheetName: saved.activeSheetName,
        mappings: saved.mappings,
        saveStatus: "saved",
        hydrated: true,
      });
    } else {
      set({ hydrated: true, currentStage: "document-upload" });
    }
    void get().restoreRfqFileBlob(projectId);
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
    const firstSheet = workbook.sheets[0]?.name ?? null;
    const projectId = get().projectId;
    set({
      rfqWorkbook: workbook,
      rfqFileBlob: sourceFile,
      activeSheetName: firstSheet,
      currentStage: "document-upload",
      saveStatus: "unsaved",
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

  downloadQuoteFile: (id) => {
    const { quoteFiles, quoteFileBlobs } = get();
    const meta = quoteFiles.find((f) => f.id === id);
    const blob = quoteFileBlobs[id];
    if (!meta || !blob) return;
    downloadBlob(blob, meta.name);
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
};
});

export function getActiveSheetRows() {
  const { rfqWorkbook, activeSheetName } = useProjectWorkspaceStore.getState();
  if (!rfqWorkbook || !activeSheetName) return { columns: [] as string[], rows: [] };
  const sheet = rfqWorkbook.sheets.find((s) => s.name === activeSheetName);
  return sheet ?? { columns: [], rows: [] };
}
