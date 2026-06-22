"use client";

import { WorkspaceOutlookCard } from "./WorkspaceOutlookCard";
import { WorkspaceShell } from "./WorkspaceShell";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

export function WorkspaceSettings() {
  return (
    <WorkspaceShell>
      <WorkspaceTopBar title="Settings" hideWorkspaceActions />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <section>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Integrations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Connect external services to import documents into your workspace.
              </p>
            </div>
            <WorkspaceOutlookCard />
          </section>
        </div>
      </main>
    </WorkspaceShell>
  );
}
