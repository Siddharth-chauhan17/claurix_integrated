"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { projectQcrWorkspacePath } from "@/lib/projectWorkstation";
import { loadWorkspaceFromSession } from "@/lib/workspace/session";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { useQcrWorkspaceStore } from "@/stores/qcrWorkspaceStore";

export function GenerateQcrButton() {
  const router = useRouter();
  const projectId = useProjectWorkspaceStore((s) => s.projectId);
  const mappings = useProjectWorkspaceStore((s) => s.mappings);
  const isGenerating = useQcrWorkspaceStore((s) => s.isGenerating);
  const response = useQcrWorkspaceStore((s) => s.response);
  const generateFromWorkstation = useQcrWorkspaceStore((s) => s.generateFromWorkstation);

  const [hasStoredWorkspace, setHasStoredWorkspace] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setHasStoredWorkspace(false);
      return;
    }
    const inMemory = response?.project_id === projectId;
    const inSession = Boolean(loadWorkspaceFromSession(projectId));
    const next = inMemory || inSession;
    setHasStoredWorkspace((prev) => (prev === next ? prev : next));
  }, [projectId, response?.project_id]);

  const hasMappings = mappings.length > 0;
  const qcrAlreadyGenerated = hasStoredWorkspace;
  const disabled = !projectId || !hasMappings || isGenerating;

  const handleClick = async () => {
    if (!projectId || disabled || qcrAlreadyGenerated) return;
    try {
      await generateFromWorkstation(projectId);
      router.push(projectQcrWorkspacePath(projectId));
    } catch {
      /* error surfaced in center panel */
    }
  };

  if (!projectId) return null;

  if (qcrAlreadyGenerated) {
    return (
      <Link
        href={projectQcrWorkspacePath(projectId)}
        className="shrink-0 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-100"
      >
        Open QCR workspace
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled}
      title={
        !hasMappings
          ? "Assign at least one policy section with row mappings first"
          : undefined
      }
      className={cn(
        "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition",
        disabled
          ? "cursor-not-allowed bg-slate-100 text-slate-400"
          : "bg-primary-600 text-white hover:bg-primary-700"
      )}
    >
      {isGenerating ? "Generating…" : "Generate QCR"}
    </button>
  );
}
