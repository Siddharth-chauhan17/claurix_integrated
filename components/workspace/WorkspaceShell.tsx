"use client";

import { Suspense, type ReactNode } from "react";
import { OutlookOAuthCallbackHandler } from "./OutlookOAuthCallbackHandler";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

interface WorkspaceShellProps {
  children: ReactNode;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8f9]">
      <Suspense fallback={null}>
        <OutlookOAuthCallbackHandler />
      </Suspense>
      <WorkspaceSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
