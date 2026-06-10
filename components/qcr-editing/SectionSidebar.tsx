"use client";

import { countClausesBySection, resolveWorkspaceSections } from "@/lib/qcr-editing/selectors";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { projectWorkstationPath } from "@/lib/projectWorkstation";
import { PanelToggleButton } from "./PanelToggleButton";

const SECTION_SHORT: Record<string, string> = {
  property_damage: "PD",
  business_interruption: "BI",
  extensions: "EX",
  special_conditions: "SC",
};

export function SectionSidebar() {
  const clauses = useQcrEditingStore((s) => s.clauses);
  const workspace = useQcrEditingStore((s) => s.workspace);
  const activeSectionId = useQcrEditingStore((s) => s.ui.activeSectionId);
  const collapsed = useQcrEditingStore((s) => s.ui.sidebarCollapsed);
  const setActiveSection = useQcrEditingStore((s) => s.setActiveSection);
  const toggleSidebar = useQcrEditingStore((s) => s.toggleSidebar);
  const dirtyCount = useQcrEditingStore((s) => s.draft.dirtyClauseIds.length);

  const sections = resolveWorkspaceSections(workspace);
  const counts = countClausesBySection(clauses, sections);
  const reviewedCount = clauses.reduce(
    (n, c) => n + c.comparisons.filter((x) => x.reviewed).length,
    0
  );
  const totalComparisons = clauses.length * (workspace?.insurers.length ?? 0);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-slate-200 bg-[#1e293b] text-slate-100 transition-[width] duration-200 ease-out",
        collapsed ? "w-[56px]" : "w-[248px]"
      )}
    >
      <div
        className={cn(
          "flex border-b border-slate-700",
          collapsed ? "flex-col items-center gap-2 px-2 py-3" : "items-start justify-between gap-2 px-4 py-4"
        )}
      >
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              QCR Workspace
            </p>
            <h1 className="mt-1 truncate text-sm font-semibold text-white">
              {workspace?.meta.project_name ?? "Comparison"}
            </h1>
            <p className="truncate text-xs text-slate-400">
              {workspace?.meta.client_name}
            </p>
          </div>
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-[10px] font-bold text-white"
            title={workspace?.meta.project_name ?? "QCR"}
          >
            QCR
          </span>
        )}
        <PanelToggleButton
          collapsed={collapsed}
          onClick={toggleSidebar}
          variant="dark"
          side="left"
          expandAriaLabel="Expand sections sidebar"
          collapseAriaLabel="Collapse sections sidebar"
        />
      </div>

      {!collapsed ? (
        <div className="grid grid-cols-2 gap-2 border-b border-slate-700 px-3 py-3">
          <div className="rounded-lg bg-slate-800/80 px-2 py-2">
            <p className="text-[10px] uppercase text-slate-500">Clauses</p>
            <p className="text-lg font-semibold text-white">{clauses.length}</p>
          </div>
          <div className="rounded-lg bg-slate-800/80 px-2 py-2">
            <p className="text-[10px] uppercase text-slate-500">Reviewed</p>
            <p className="text-lg font-semibold text-emerald-400">
              {reviewedCount}
              <span className="text-xs text-slate-500">/{totalComparisons}</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 border-b border-slate-700 py-2">
          <span
            className="text-[10px] font-semibold text-white"
            title={`${clauses.length} clauses`}
          >
            {clauses.length}
          </span>
          <span
            className="text-[10px] text-emerald-400"
            title={`${reviewedCount} reviewed`}
          >
            {reviewedCount}✓
          </span>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {!collapsed ? (
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Sections
          </p>
        ) : null}
        {sections.map((section) => {
          const active = section.id === activeSectionId;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              title={collapsed ? section.label : undefined}
              className={cn(
                "mb-1 flex w-full rounded-lg text-left text-sm transition",
                collapsed
                  ? "flex-col items-center justify-center gap-0.5 px-1 py-2"
                  : "items-center justify-between px-3 py-2.5",
                active
                  ? "bg-primary-600 text-white shadow-md"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              {collapsed ? (
                <>
                  <span className="text-[10px] font-bold">
                    {SECTION_SHORT[section.id] ??
                      section.label.slice(0, 2).toUpperCase()}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      active ? "text-primary-100" : "text-slate-500"
                    )}
                  >
                    {counts[section.id]}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium">{section.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      active ? "bg-primary-500 text-white" : "bg-slate-700 text-slate-300"
                    )}
                  >
                    {counts[section.id]}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-slate-700 text-xs text-slate-400",
          collapsed ? "flex flex-col items-center gap-2 px-2 py-3" : "space-y-3 px-3 py-3"
        )}
      >
        {workspace?.meta.project_id ? (
          <Link
            href={projectWorkstationPath(workspace.meta.project_id)}
            title="Back to workstation"
            className={cn(
              "font-medium text-primary-300 hover:text-primary-200",
              collapsed
                ? "flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-800"
                : "block px-1"
            )}
          >
            {collapsed ? "←" : "← Workstation"}
          </Link>
        ) : null}
        {!collapsed && dirtyCount > 0 ? (
          <p className="px-1 font-medium text-amber-400/90">
            {dirtyCount} clause(s) with local edits
          </p>
        ) : null}
      </div>
    </aside>
  );
}
