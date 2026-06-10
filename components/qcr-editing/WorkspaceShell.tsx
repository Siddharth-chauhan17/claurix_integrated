"use client";

import { ActivityLogPanel } from "./ActivityLogPanel";
import { ClauseTable } from "./ClauseTable";
import { ReviewPanelV2 } from "./ReviewPanelV2";
import { SectionSidebar } from "./SectionSidebar";
import { WorkspaceToolbar } from "./WorkspaceToolbar";
import { WorkspaceViewTabs } from "./WorkspaceViewTabs";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";

/** Enterprise QCR editing workspace — Excel-style grid + broker review panel. */
export function WorkspaceShell() {
  const workspaceView = useQcrEditingStore((s) => s.ui.workspaceView);
  const isComparison = workspaceView === "comparison";

  return (
    <div className="flex h-screen overflow-hidden bg-[#e8eaed]">
      <SectionSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceToolbar />
        <WorkspaceViewTabs />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="min-w-0 flex-1 overflow-hidden bg-white shadow-inner">
            {isComparison ? <ClauseTable /> : <ActivityLogPanel />}
          </main>
          {isComparison ? <ReviewPanelV2 /> : null}
        </div>
      </div>
    </div>
  );
}
