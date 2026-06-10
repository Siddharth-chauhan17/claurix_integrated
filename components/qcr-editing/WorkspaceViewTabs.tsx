"use client";

import type { QcrWorkspaceView } from "@/lib/qcr-editing/workspace-store";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";
import { useActivityStore } from "@/lib/qcr-editing/activity-store";
import { cn } from "@/lib/utils";
import { UnsavedChangesMenu } from "./UnsavedChangesMenu";

const TABS: { id: QcrWorkspaceView; label: string }[] = [
  { id: "comparison", label: "Comparison" },
  { id: "activity_log", label: "Activity log" },
];

export function WorkspaceViewTabs() {
  const view = useQcrEditingStore((s) => s.ui.workspaceView);
  const setWorkspaceView = useQcrEditingStore((s) => s.setWorkspaceView);
  const projectId = useQcrEditingStore((s) => s.workspace?.meta.project_id);
  const eventCount = useActivityStore((s) =>
    projectId ? (s.eventsByProject[projectId]?.length ?? 0) : 0
  );

  return (
    <div className="flex shrink-0 items-center border-b border-slate-200 bg-white px-3">
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setWorkspaceView(tab.id)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition",
                active
                  ? "text-primary-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary-600"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {tab.label}
              {tab.id === "activity_log" && eventCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                  {eventCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <UnsavedChangesMenu />
    </div>
  );
}
