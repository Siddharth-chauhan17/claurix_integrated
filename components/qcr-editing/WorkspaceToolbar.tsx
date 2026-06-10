"use client";

import type { ComparisonStatus } from "@/lib/qcr-editing/types";
import { STATUS_LABELS } from "@/lib/qcr-editing/status-styles";
import { clearPersistedQcrWorkspace } from "@/lib/qcr-editing/mock-api";
import {
  useQcrEditingStore,
  useVisibleClauses,
} from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";
import { InsurerColumnsMenu } from "./InsurerColumnsMenu";

const STATUS_FILTERS: ComparisonStatus[] = [
  "agreed",
  "partially_agreed",
  "not_agreed",
];

export function WorkspaceToolbar() {
  const workspace = useQcrEditingStore((s) => s.workspace);
  const filter = useQcrEditingStore((s) => s.ui.filter);
  const isSaving = useQcrEditingStore((s) => s.ui.isSaving);
  const saveError = useQcrEditingStore((s) => s.ui.saveError);
  const setFilter = useQcrEditingStore((s) => s.setFilter);
  const saveWorkspace = useQcrEditingStore((s) => s.saveWorkspace);
  const loadWorkspace = useQcrEditingStore((s) => s.loadWorkspace);
  const toggleRightPanel = useQcrEditingStore((s) => s.toggleRightPanel);
  const rightPanelOpen = useQcrEditingStore((s) => s.ui.rightPanelOpen);

  const visibleClauses = useVisibleClauses();
  const visibleCount = visibleClauses.length;
  const hasUnsaved = useQcrEditingStore((s) => s.draft.dirtyClauseIds.length > 0);

  const toggleStatus = (status: ComparisonStatus) => {
    const current = filter.statuses ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setFilter({ statuses: next.length ? next : undefined });
  };

  const handleExport = () => {
    const { workspace: ws, clauses } = useQcrEditingStore.getState();
    if (!ws) return;
    const blob = new Blob(
      [JSON.stringify({ workspace: ws, clauses }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qcr-${ws.workspace_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <div className="relative min-w-0 flex-1 max-w-md">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={filter.search ?? ""}
          onChange={(e) => setFilter({ search: e.target.value })}
          placeholder="Search clauses, proposals, notes…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-1 focus:ring-primary-200"
        />
      </div>

      <div className="hidden items-center gap-1 lg:flex">
        <span className="mr-1 text-[10px] font-semibold uppercase text-slate-400">
          Status
        </span>
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleStatus(status)}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold uppercase transition",
              filter.statuses?.includes(status)
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <InsurerColumnsMenu />

      <span className="hidden text-xs text-slate-500 md:inline">
        {visibleCount} clause{visibleCount !== 1 ? "s" : ""}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {hasUnsaved ? (
          <span className="hidden text-xs font-medium text-amber-600 sm:inline">
            Unsaved
          </span>
        ) : null}
        {saveError ? (
          <span className="max-w-[120px] truncate text-xs text-red-600" title={saveError}>
            Save failed
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => void saveWorkspace()}
          disabled={isSaving}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => {
            if (!workspace) return;
            clearPersistedQcrWorkspace(workspace.workspace_id);
            void loadWorkspace(workspace.meta.project_id);
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          title="Discard local save and reload AI comparison data"
        >
          Reload AI data
        </button>
        <button
          type="button"
          onClick={() => toggleRightPanel()}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
        >
          {rightPanelOpen ? "Hide review" : "Show review"}
        </button>
      </div>
    </div>
  );
}
