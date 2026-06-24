"use client";

import Link from "next/link";
import { GenerateQcrButton } from "@/components/project-workspace/GenerateQcrButton";
import { stageLabel } from "@/lib/project-workspace/stages";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

export function WorkspaceHeader() {
  const projectName = useProjectWorkspaceStore((s) => s.projectName);
  const clientName = useProjectWorkspaceStore((s) => s.clientName);
  const clientId = useProjectWorkspaceStore((s) => s.clientId);
  const currentStage = useProjectWorkspaceStore((s) => s.currentStage);
  const saveStatus = useProjectWorkspaceStore((s) => s.saveStatus);

  const showGenerateQcr =
    currentStage === "policy-mapping" ||
    currentStage === "workstation" ||
    currentStage === "export-qcr";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-4">
        {clientId ? (
          <Link
            href={`/clients/${clientId}`}
            className="shrink-0 text-xs font-medium text-slate-500 hover:text-primary-600"
          >
            Client
          </Link>
        ) : null}
        <div className="min-w-0 border-l border-slate-200 pl-4">
          <p className="truncate text-sm font-semibold text-slate-900">{projectName}</p>
          <p className="truncate text-xs text-slate-500">
            {clientName}
            <span className="mx-1.5 text-slate-300">·</span>
            {stageLabel(currentStage)}
            <span className="mx-1.5 text-slate-300">·</span>
            <span
              className={cn(
                saveStatus === "saved" ? "text-emerald-600" : "text-amber-600"
              )}
            >
              {saveStatus === "saved" ? "Draft saved" : "Unsaved changes"}
            </span>
          </p>
        </div>
      </div>
      {showGenerateQcr ? (
        <div className="flex shrink-0 items-center gap-2">
          <GenerateQcrButton />
        </div>
      ) : null}
    </header>
  );
}
