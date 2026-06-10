/**
 * Zustand store for human-in-the-loop QCR editing.
 *
 * Separates:
 * - domain: clause comparisons (working copy + baseline for dirty tracking)
 * - UI: selection, filters, loading
 * - draft: unsaved edits metadata (persistence hooks ready)
 *
 * NOT the renderer shell store (see stores/workspace-store.ts).
 */

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { generateMockActivityEvents } from "./activity-mock-data";
import { useActivityStore } from "./activity-store";
import { logClauseBrokerRemark, logInsurerPatch } from "./activity-logging";
import { fetchQcrWorkspace, saveQcrWorkspace } from "./mock-api";
import {
  applyClausePatch,
  applyInsurerComparisonPatch,
  filterClauses,
  filterClausesBySection,
  getClauseById,
  type ClauseFilter,
} from "./selectors";
import {
  findRemarkDraft,
  removeRemarkDraftFromList,
  upsertRemarkDraftInList,
  type InsurerRemarkDraft,
} from "./remark-drafts";
import type {
  ClauseComparison,
  ClauseComparisonPatch,
  ComparisonStatus,
  InsurerComparisonPatch,
  OverrideStatus,
  QcrWorkspace,
} from "./types";

export type { InsurerRemarkDraft };

export type QcrWorkspaceView = "comparison" | "activity_log";

export type QcrEditingUiState = {
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  saveError: string | null;
  workspaceView: QcrWorkspaceView;
  activeSectionId: string;
  activeClauseId: string | null;
  activeInsurer: string | null;
  filter: ClauseFilter;
  rightPanelOpen: boolean;
  sidebarCollapsed: boolean;
  /** Insurer column visibility toggles */
  visibleInsurers: Record<string, boolean>;
};

export type QcrEditingDraftState = {
  dirtyClauseIds: string[];
  lastEditedAt: string | null;
  /** Insurer remark drafts saved when user navigates away without pressing Save */
  remarkDrafts: InsurerRemarkDraft[];
};

type QcrEditingStore = {
  /** Loaded workspace envelope */
  workspace: QcrWorkspace | null;
  /** Editable working copy (normalized clauses) */
  clauses: ClauseComparison[];
  /** Snapshot for dirty detection / revert */
  baselineClauses: ClauseComparison[];
  ui: QcrEditingUiState;
  draft: QcrEditingDraftState;

  loadWorkspace: (projectId: string) => Promise<void>;
  resetWorkspace: () => void;
  setActiveSection: (sectionId: string) => void;
  setActiveClause: (clauseId: string | null) => void;
  setActiveInsurer: (insurer: string | null) => void;
  setFilter: (patch: Partial<ClauseFilter>) => void;
  setWorkspaceView: (view: QcrWorkspaceView) => void;
  toggleRightPanel: (open?: boolean) => void;
  toggleSidebar: () => void;
  toggleInsurerColumn: (insurer: string) => void;
  markReviewed: (clauseId: string, insurer: string, reviewed: boolean) => void;
  updateComparisonStatus: (
    clauseId: string,
    insurer: string,
    status: ComparisonStatus
  ) => void;
  updateDifferences: (
    clauseId: string,
    insurer: string,
    differences: string[]
  ) => void;
  updateGapScore: (clauseId: string, insurer: string, gapScore: number) => void;

  updateClause: (clauseId: string, patch: ClauseComparisonPatch) => void;
  updateInsurerComparison: (
    clauseId: string,
    insurer: string,
    patch: InsurerComparisonPatch
  ) => void;
  setBrokerOverride: (
    clauseId: string,
    insurer: string,
    override: OverrideStatus
  ) => void;
  updateBrokerNote: (clauseId: string, insurer: string, note: string) => void;
  updateProposalClause: (
    clauseId: string,
    insurer: string,
    proposal: string
  ) => void;
  upsertRemarkDraft: (
    entry: Omit<InsurerRemarkDraft, "updated_at"> & { updated_at?: string }
  ) => void;
  discardRemarkDraft: (clauseId: string, insurer: string) => void;
  commitRemarkDraft: (clauseId: string, insurer: string) => void;
  openRemarkDraft: (draft: InsurerRemarkDraft) => void;

  revertClause: (clauseId: string) => void;
  saveWorkspace: () => Promise<void>;
};

const defaultUi: QcrEditingUiState = {
  isLoading: false,
  isSaving: false,
  loadError: null,
  saveError: null,
  workspaceView: "comparison",
  activeSectionId: "property_damage",
  activeClauseId: null,
  activeInsurer: null,
  filter: {},
  rightPanelOpen: true,
  sidebarCollapsed: false,
  visibleInsurers: {},
};

const defaultDraft: QcrEditingDraftState = {
  dirtyClauseIds: [],
  lastEditedAt: null,
  remarkDrafts: [],
};

function cloneClauses(clauses: ClauseComparison[]): ClauseComparison[] {
  return JSON.parse(JSON.stringify(clauses)) as ClauseComparison[];
}

const PERSIST_DEBOUNCE_MS = 800;

let persistDebounceId: ReturnType<typeof setTimeout> | null = null;
let savePending = false;

function schedulePersistWorkspace(immediate = false): void {
  if (persistDebounceId) {
    clearTimeout(persistDebounceId);
    persistDebounceId = null;
  }
  if (immediate) {
    void useQcrEditingStore.getState().saveWorkspace();
    return;
  }
  persistDebounceId = setTimeout(() => {
    persistDebounceId = null;
    void useQcrEditingStore.getState().saveWorkspace();
  }, PERSIST_DEBOUNCE_MS);
}

function markDirty(
  draft: QcrEditingDraftState,
  clauseId: string,
  clauses: ClauseComparison[],
  baseline: ClauseComparison[]
): QcrEditingDraftState {
  const current = getClauseById(clauses, clauseId);
  const base = getClauseById(baseline, clauseId);
  const isDirty =
    current && base && JSON.stringify(current) !== JSON.stringify(base);
  const ids = new Set(draft.dirtyClauseIds);
  if (isDirty) ids.add(clauseId);
  else ids.delete(clauseId);
  return {
    ...draft,
    dirtyClauseIds: Array.from(ids),
    lastEditedAt: new Date().toISOString(),
  };
}

export const useQcrEditingStore = create<QcrEditingStore>((set, get) => ({
  workspace: null,
  clauses: [],
  baselineClauses: [],
  ui: defaultUi,
  draft: defaultDraft,

  loadWorkspace: async (projectId) => {
    set({
      ui: { ...defaultUi, isLoading: true, loadError: null },
      draft: defaultDraft,
    });
    try {
      const ws = useProjectWorkspaceStore.getState();
      if (ws.projectId !== projectId) {
        useProjectWorkspaceStore.setState({ projectId });
      }
      useProjectWorkspaceStore.getState().hydrate(projectId);
      const workspace = await fetchQcrWorkspace(projectId, {
        projectName: ws.projectName || undefined,
        clientName: ws.clientName || undefined,
      });
      const clauses = cloneClauses(workspace.clauses);
      const defaultSectionId =
        workspace.sections?.[0]?.id ?? clauses[0]?.section_id ?? "property_damage";
      const sectionClauses = clauses.filter(
        (c) => c.section_id === defaultSectionId
      );
      const first = sectionClauses[0] ?? clauses[0];
      const visibleInsurers = Object.fromEntries(
        workspace.insurers.map((i) => [i, true])
      );
      useActivityStore
        .getState()
        .initProject(projectId, generateMockActivityEvents(projectId));

      set({
        workspace,
        clauses,
        baselineClauses: cloneClauses(workspace.clauses),
        ui: {
          ...defaultUi,
          isLoading: false,
          activeSectionId: first?.section_id ?? defaultSectionId,
          activeClauseId: first?.clause_id ?? null,
          activeInsurer: workspace.insurers[0] ?? null,
          visibleInsurers,
        },
      });
    } catch (e) {
      set({
        ui: {
          ...defaultUi,
          isLoading: false,
          loadError:
            e instanceof Error ? e.message : "Failed to load QCR workspace",
        },
      });
    }
  },

  resetWorkspace: () => {
    useActivityStore.getState().reset();
    set({
      workspace: null,
      clauses: [],
      baselineClauses: [],
      ui: defaultUi,
      draft: defaultDraft,
    });
  },

  setActiveSection: (sectionId) => {
    const { clauses } = get();
    const first = clauses.find((c) => c.section_id === sectionId);
    set((s) => ({
      ui: {
        ...s.ui,
        activeSectionId: sectionId,
        activeClauseId: first?.clause_id ?? null,
      },
    }));
  },

  setActiveClause: (clauseId) =>
    set((s) => ({
      ui: {
        ...s.ui,
        activeClauseId: clauseId,
        ...(clauseId ? { rightPanelOpen: true } : {}),
      },
    })),

  setActiveInsurer: (insurer) =>
    set((s) => ({
      ui: {
        ...s.ui,
        activeInsurer: insurer,
        ...(insurer ? { rightPanelOpen: true } : {}),
      },
    })),

  setFilter: (patch) =>
    set((s) => ({
      ui: { ...s.ui, filter: { ...s.ui.filter, ...patch } },
    })),

  setWorkspaceView: (view) =>
    set((s) => ({ ui: { ...s.ui, workspaceView: view } })),

  toggleRightPanel: (open) =>
    set((s) => ({
      ui: {
        ...s.ui,
        rightPanelOpen: open !== undefined ? open : !s.ui.rightPanelOpen,
      },
    })),

  toggleSidebar: () =>
    set((s) => ({
      ui: { ...s.ui, sidebarCollapsed: !s.ui.sidebarCollapsed },
    })),

  toggleInsurerColumn: (insurer) =>
    set((s) => ({
      ui: {
        ...s.ui,
        visibleInsurers: {
          ...s.ui.visibleInsurers,
          [insurer]: !s.ui.visibleInsurers[insurer],
        },
      },
    })),

  markReviewed: (clauseId, insurer, reviewed) => {
    get().updateInsurerComparison(clauseId, insurer, { reviewed });
  },

  updateComparisonStatus: (clauseId, insurer, status) => {
    get().updateInsurerComparison(clauseId, insurer, { status });
  },

  updateDifferences: (clauseId, insurer, differences) => {
    get().updateInsurerComparison(clauseId, insurer, { differences });
  },

  updateGapScore: (clauseId, insurer, gapScore) => {
    get().updateInsurerComparison(clauseId, insurer, {
      gap_score: Math.max(0, Math.min(100, gapScore)),
    });
  },

  updateClause: (clauseId, patch) => {
    const { clauses, baselineClauses, draft, workspace } = get();
    const before = getClauseById(clauses, clauseId);
    const next = clauses.map((c) =>
      c.clause_id === clauseId ? applyClausePatch(c, patch) : c
    );
    if (before && patch.broker_remark !== undefined) {
      logClauseBrokerRemark(
        before,
        before.broker_remark,
        patch.broker_remark,
        workspace?.meta.project_id
      );
    }
    set({
      clauses: next,
      draft: markDirty(draft, clauseId, next, baselineClauses),
    });
    schedulePersistWorkspace();
  },

  updateInsurerComparison: (clauseId, insurer, patch) => {
    const { clauses, baselineClauses, draft, workspace } = get();
    logInsurerPatch(clauses, clauseId, insurer, patch, workspace?.meta.project_id);
    const next = clauses.map((c) =>
      c.clause_id === clauseId
        ? applyInsurerComparisonPatch(c, insurer, patch)
        : c
    );
    set({
      clauses: next,
      draft: markDirty(draft, clauseId, next, baselineClauses),
    });
    schedulePersistWorkspace();
  },

  setBrokerOverride: (clauseId, insurer, override) => {
    get().updateInsurerComparison(clauseId, insurer, {
      override_status: override,
    });
  },

  updateBrokerNote: (clauseId, insurer, note) => {
    get().updateInsurerComparison(clauseId, insurer, { broker_note: note });
  },

  /** Commits insurer remark to working copy + baseline (clears dirty when no other diffs). */
  updateProposalClause: (clauseId, insurer, proposal) => {
    const { clauses, baselineClauses, draft, workspace } = get();
    const patch = { proposal_clause: proposal };
    logInsurerPatch(clauses, clauseId, insurer, patch, workspace?.meta.project_id);
    const next = clauses.map((c) =>
      c.clause_id === clauseId
        ? applyInsurerComparisonPatch(c, insurer, patch)
        : c
    );
    const nextBaseline = baselineClauses.map((c) =>
      c.clause_id === clauseId
        ? applyInsurerComparisonPatch(c, insurer, patch)
        : c
    );
    const remarkDrafts = removeRemarkDraftFromList(
      draft.remarkDrafts,
      clauseId,
      insurer
    );
    set({
      clauses: next,
      baselineClauses: nextBaseline,
      draft: {
        ...markDirty(draft, clauseId, next, nextBaseline),
        remarkDrafts,
      },
    });
    schedulePersistWorkspace(true);
  },

  upsertRemarkDraft: (entry) =>
    set((s) => ({
      draft: {
        ...s.draft,
        remarkDrafts: upsertRemarkDraftInList(s.draft.remarkDrafts, entry),
        lastEditedAt: new Date().toISOString(),
      },
    })),

  discardRemarkDraft: (clauseId, insurer) =>
    set((s) => ({
      draft: {
        ...s.draft,
        remarkDrafts: removeRemarkDraftFromList(
          s.draft.remarkDrafts,
          clauseId,
          insurer
        ),
      },
    })),

  commitRemarkDraft: (clauseId, insurer) => {
    const { draft } = get();
    const stored = findRemarkDraft(draft.remarkDrafts, clauseId, insurer);
    if (!stored) return;
    get().updateProposalClause(clauseId, insurer, stored.draft);
  },

  openRemarkDraft: (target) => {
    const clause = getClauseById(get().clauses, target.clause_id);
    set((s) => ({
      ui: {
        ...s.ui,
        workspaceView: "comparison",
        activeClauseId: target.clause_id,
        activeInsurer: target.insurer,
        rightPanelOpen: true,
        activeSectionId: clause?.section_id ?? s.ui.activeSectionId,
      },
    }));
  },

  revertClause: (clauseId) => {
    const { clauses, baselineClauses, draft } = get();
    const base = getClauseById(baselineClauses, clauseId);
    if (!base) return;
    const next = clauses.map((c) => (c.clause_id === clauseId ? cloneClauses([base])[0] : c));
    const ids = draft.dirtyClauseIds.filter((id) => id !== clauseId);
    const remarkDrafts = draft.remarkDrafts.filter((d) => d.clause_id !== clauseId);
    set({ clauses: next, draft: { ...draft, dirtyClauseIds: ids, remarkDrafts } });
    schedulePersistWorkspace(true);
  },

  saveWorkspace: async () => {
    const { workspace, clauses, ui } = get();
    if (!workspace) return;
    if (ui.isSaving) {
      savePending = true;
      return;
    }
    set((s) => ({ ui: { ...s.ui, isSaving: true, saveError: null } }));
    try {
      await saveQcrWorkspace({
        project_id: workspace.meta.project_id,
        workspace_id: workspace.workspace_id,
        clauses,
        saved_at: new Date().toISOString(),
      });
      set((s) => ({
        baselineClauses: cloneClauses(get().clauses),
        draft: {
          remarkDrafts: s.draft.remarkDrafts,
          lastEditedAt: s.draft.lastEditedAt,
          dirtyClauseIds: [],
        },
        ui: { ...s.ui, isSaving: false },
      }));
    } catch (e) {
      set((s) => ({
        ui: {
          ...s.ui,
          isSaving: false,
          saveError: e instanceof Error ? e.message : "Save failed",
        },
      }));
    } finally {
      if (savePending) {
        savePending = false;
        void get().saveWorkspace();
      }
    }
  },
}));

/** Derived visible clauses (selector + store filter). */
export function selectVisibleClauses(): ClauseComparison[] {
  const { clauses, ui } = useQcrEditingStore.getState();
  const bySection = filterClausesBySection(clauses, ui.activeSectionId);
  return filterClauses(bySection, ui.filter);
}

export function selectVisibleInsurers(): string[] {
  const { workspace, ui } = useQcrEditingStore.getState();
  if (!workspace) return [];
  return workspace.insurers.filter((i) => ui.visibleInsurers[i] !== false);
}

export function selectHasUnsavedChanges(): boolean {
  const { draft } = useQcrEditingStore.getState();
  return draft.dirtyClauseIds.length > 0 || draft.remarkDrafts.length > 0;
}

export function selectRemarkDraftCount(): number {
  return useQcrEditingStore.getState().draft.remarkDrafts.length;
}

export function useRemarkDrafts(): InsurerRemarkDraft[] {
  return useQcrEditingStore(useShallow((s) => s.draft.remarkDrafts));
}

/**
 * Reactive hooks for UI — useShallow avoids infinite re-renders when returning
 * new array references from derived selectors.
 */
export function useVisibleClauses(): ClauseComparison[] {
  return useQcrEditingStore(
    useShallow((s) => {
      const bySection = filterClausesBySection(s.clauses, s.ui.activeSectionId);
      return filterClauses(bySection, s.ui.filter);
    })
  );
}

export function useVisibleInsurers(): string[] {
  return useQcrEditingStore(
    useShallow((s) => {
      if (!s.workspace) return [];
      return s.workspace.insurers.filter((i) => s.ui.visibleInsurers[i] !== false);
    })
  );
}
