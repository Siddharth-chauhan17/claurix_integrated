"use client";

import { AssignPolicyMenu } from "./AssignPolicyMenu";
import { EmailComposerProvider } from "@/components/email/EmailComposerProvider";
import { WorkflowSidebar } from "./WorkflowSidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceMainPanel } from "./WorkspaceMainPanel";

/** Full-screen project workstation (RFQ grid, policy mapping) — separate from /workspace home. */
export function ProjectWorkstationShell() {
  return (
    <EmailComposerProvider>
      <div className="flex h-screen overflow-hidden bg-[#eef0f3]">
        <WorkflowSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkspaceHeader />
          <div className="min-h-0 flex-1 overflow-hidden">
            <WorkspaceMainPanel />
          </div>
        </div>
        <AssignPolicyMenu />
      </div>
    </EmailComposerProvider>
  );
}
