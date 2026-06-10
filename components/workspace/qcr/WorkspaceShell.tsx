"use client";

import { useEffect } from "react";
import { registerWorkspaceRenderers } from "@/components/workspace/renderers/registerRenderers";
import { QcrWorkspaceSidebar } from "@/components/workspace/qcr/QcrWorkspaceSidebar";
import { WorkspaceContent } from "@/components/workspace/qcr/WorkspaceContent";
import { WorkspaceRightPanel } from "@/components/workspace/qcr/WorkspaceRightPanel";
import { WorkspaceToolbar } from "@/components/workspace/qcr/WorkspaceToolbar";

/** Enterprise QCR workspace chrome — schema-driven center, pluggable renderers. */
export function WorkspaceShell() {
  useEffect(() => {
    registerWorkspaceRenderers();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f7]">
      <QcrWorkspaceSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceToolbar />
        <div className="flex min-h-0 flex-1">
          <WorkspaceContent />
          <WorkspaceRightPanel />
        </div>
      </div>
    </div>
  );
}
