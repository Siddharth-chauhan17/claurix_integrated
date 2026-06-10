"use client";

import Link from "next/link";
import { SectionNavigation } from "@/components/workspace/qcr/SectionNavigation";
import { getRiskSummary } from "@/lib/workspace-engine";
import { projectWorkstationPath } from "@/lib/projectWorkstation";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";

/** Policy-section navigation — not the broker home WorkspaceSidebar. */
export function QcrWorkspaceSidebar() {
  const collapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);
  const workspace = useWorkspaceStore((s) => s.workspace);
  const projectId = useWorkspaceStore((s) => s.projectId);
  const projectName = useWorkspaceStore((s) => s.projectName);
  const clientName = useWorkspaceStore((s) => s.clientName);

  const risk = workspace ? getRiskSummary(workspace) : null;

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-[width]",
        collapsed ? "w-[56px]" : "w-[260px]"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {projectName || "QCR Workspace"}
            </p>
            <p className="truncate text-xs text-slate-500">{clientName}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {!collapsed && workspace && risk ? (
        <div className="border-b border-slate-100 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Portfolio risk
          </p>
          <p className="mt-1 text-sm font-medium capitalize text-slate-800">
            {risk.overall_dominant_risk}
          </p>
          <p className="text-xs text-slate-500">
            {workspace.sections.length} sections
          </p>
        </div>
      ) : null}

      {!collapsed ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Policy sections
          </p>
          <SectionNavigation />
        </div>
      ) : null}

      {!collapsed && projectId ? (
        <div className="border-t border-slate-200 p-3">
          <Link
            href={projectWorkstationPath(projectId)}
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            ← Back to workstation
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
