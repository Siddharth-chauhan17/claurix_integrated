/**
 * QCR workspace Zustand store — separates domain, UI, and draft state.
 * Canonical data is WorkspaceResponse JSON; renderers read via selectors + engine.
 */

import { create } from "zustand";
import type { WorkspaceFilters } from "@/lib/workspace-engine";
import type { WorkspaceResponse } from "@/types/workspace";

/** Pluggable presentation modes — swap renderers without backend changes. */
export type RendererMode = "table" | "section-cards";

export type WorkspaceDraftMeta = {
  hasUnsavedChanges: boolean;
  lastTouchedClauseId: string | null;
};

const defaultFilters: WorkspaceFilters = {
  search: "",
  categories: [],
  riskLevels: [],
};

type WorkspaceDomainState = {
  workspace: WorkspaceResponse | null;
  activeSectionId: string | null;
  activeClauseId: string | null;
};

type WorkspaceUiState = {
  isLoading: boolean;
  loadError: string | null;
  rendererMode: RendererMode;
  rightPanelOpen: boolean;
  sidebarCollapsed: boolean;
  filters: WorkspaceFilters;
};

type WorkspaceDraftState = {
  draft: WorkspaceDraftMeta;
};

type WorkspaceStoreState = WorkspaceDomainState &
  WorkspaceUiState &
  WorkspaceDraftState & {
    projectId: string | null;
    projectName: string;
    clientName: string;
  };

type WorkspaceStoreActions = {
  setWorkspace: (workspace: WorkspaceResponse) => void;
  resetWorkspace: () => void;
  setActiveSection: (sectionId: string | null) => void;
  setActiveClause: (clauseId: string | null) => void;
  setRendererMode: (mode: RendererMode) => void;
  toggleRightPanel: (open?: boolean) => void;
  toggleSidebar: () => void;
  setWorkspaceLoading: (loading: boolean, error?: string | null) => void;
  setFilters: (filters: Partial<WorkspaceFilters>) => void;
  initWorkspaceContext: (meta: {
    projectId: string;
    projectName?: string;
    clientName?: string;
  }) => void;
  markDraftTouched: (clauseId: string | null) => void;
};

const initialState: WorkspaceStoreState = {
  projectId: null,
  projectName: "",
  clientName: "",
  workspace: null,
  activeSectionId: null,
  activeClauseId: null,
  isLoading: false,
  loadError: null,
  rendererMode: "table",
  rightPanelOpen: true,
  sidebarCollapsed: false,
  filters: defaultFilters,
  draft: {
    hasUnsavedChanges: false,
    lastTouchedClauseId: null,
  },
};

export const useWorkspaceStore = create<WorkspaceStoreState & WorkspaceStoreActions>(
  (set, get) => ({
    ...initialState,

    initWorkspaceContext: (meta) =>
      set({
        projectId: meta.projectId,
        projectName: meta.projectName ?? "",
        clientName: meta.clientName ?? "",
      }),

    setWorkspace: (workspace) => {
      const firstSection = workspace.sections[0]?.section_id ?? null;
      const firstClause =
        workspace.sections[0]?.clauses[0]?.clause_id ?? null;
      set({
        workspace,
        activeSectionId: firstSection,
        activeClauseId: firstClause,
        isLoading: false,
        loadError: null,
        draft: {
          hasUnsavedChanges: false,
          lastTouchedClauseId: null,
        },
      });
    },

    resetWorkspace: () =>
      set({
        ...initialState,
        projectId: get().projectId,
        projectName: get().projectName,
        clientName: get().clientName,
      }),

    setActiveSection: (sectionId) => {
      const workspace = get().workspace;
      if (!workspace || !sectionId) {
        set({ activeSectionId: sectionId, activeClauseId: null });
        return;
      }
      const section = workspace.sections.find((s) => s.section_id === sectionId);
      const firstClause = section?.clauses[0]?.clause_id ?? null;
      set({ activeSectionId: sectionId, activeClauseId: firstClause });
    },

    setActiveClause: (clauseId) => set({ activeClauseId: clauseId }),

    setRendererMode: (mode) => set({ rendererMode: mode }),

    toggleRightPanel: (open) =>
      set((s) => ({
        rightPanelOpen: open !== undefined ? open : !s.rightPanelOpen,
      })),

    toggleSidebar: () =>
      set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    setWorkspaceLoading: (loading, error = null) =>
      set({ isLoading: loading, loadError: error }),

    setFilters: (partial) =>
      set((s) => ({
        filters: { ...s.filters, ...partial },
      })),

    markDraftTouched: (clauseId) =>
      set({
        draft: {
          hasUnsavedChanges: true,
          lastTouchedClauseId: clauseId,
        },
      }),
  })
);

/** Domain selectors — keep components free of nested JSON traversal. */
export function selectWorkspace() {
  return useWorkspaceStore.getState().workspace;
}

export function selectActiveSection() {
  const { workspace, activeSectionId } = useWorkspaceStore.getState();
  if (!workspace || !activeSectionId) return null;
  return (
    workspace.sections.find((s) => s.section_id === activeSectionId) ?? null
  );
}

export function selectActiveClause() {
  const { workspace, activeSectionId, activeClauseId } =
    useWorkspaceStore.getState();
  if (!workspace || !activeSectionId || !activeClauseId) return null;
  const section = workspace.sections.find(
    (s) => s.section_id === activeSectionId
  );
  return section?.clauses.find((c) => c.clause_id === activeClauseId) ?? null;
}
