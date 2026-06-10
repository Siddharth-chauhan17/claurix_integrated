"use client";

import type { RiskLevel } from "@/types/workspace";
import { useWorkspaceStore, type RendererMode } from "@/stores/workspace-store";

const MODES: { id: RendererMode; label: string }[] = [
  { id: "table", label: "Table" },
  { id: "section-cards", label: "Cards" },
];

const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];

export function WorkspaceToolbar() {
  const rendererMode = useWorkspaceStore((s) => s.rendererMode);
  const setRendererMode = useWorkspaceStore((s) => s.setRendererMode);
  const filters = useWorkspaceStore((s) => s.filters);
  const setFilters = useWorkspaceStore((s) => s.setFilters);
  const rightPanelOpen = useWorkspaceStore((s) => s.rightPanelOpen);
  const toggleRightPanel = useWorkspaceStore((s) => s.toggleRightPanel);
  const workspace = useWorkspaceStore((s) => s.workspace);

  const toggleRisk = (risk: RiskLevel) => {
    const next = filters.riskLevels.includes(risk)
      ? filters.riskLevels.filter((r) => r !== risk)
      : [...filters.riskLevels, risk];
    setFilters({ riskLevels: next });
  };

  return (
    <div className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
      <div className="flex rounded-lg border border-slate-200 p-0.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setRendererMode(m.id)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              rendererMode === m.id
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search clauses…"
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
        className="h-8 min-w-[200px] flex-1 max-w-md rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
      />

      <div className="hidden items-center gap-1 md:flex">
        {RISKS.map((risk) => (
          <button
            key={risk}
            type="button"
            onClick={() => toggleRisk(risk)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              filters.riskLevels.includes(risk)
                ? "bg-primary-100 text-primary-800"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {risk}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400"
        >
          Regenerate
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="cursor-not-allowed rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => toggleRightPanel()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {rightPanelOpen ? "Hide" : "Show"} insights
        </button>
      </div>

      {workspace ? (
        <span className="hidden text-xs text-slate-400 lg:inline">
          {workspace.workspace_id}
        </span>
      ) : null}
    </div>
  );
}
