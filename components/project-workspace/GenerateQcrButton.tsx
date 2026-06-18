"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { projectQcrWorkspacePath } from "@/lib/projectWorkstation";
import {
  isQcrGenerationCurrent,
  loadQcrGenerationContext,
} from "@/lib/workspace/qcr-generation-context";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { useQcrWorkspaceStore } from "@/stores/qcrWorkspaceStore";

export function GenerateQcrButton() {
  const router = useRouter();
  const projectId = useProjectWorkspaceStore((s) => s.projectId);
  const rfqWorkbook = useProjectWorkspaceStore((s) => s.rfqWorkbook);
  const mappings = useProjectWorkspaceStore((s) => s.mappings);
  const isGenerating = useQcrWorkspaceStore((s) => s.isGenerating);
  const clearQcrStore = useQcrWorkspaceStore((s) => s.clear);
  const generateFromWorkstation = useQcrWorkspaceStore((s) => s.generateFromWorkstation);

  const hasMappings = mappings.length > 0;
  const qcrIsCurrent = projectId
    ? isQcrGenerationCurrent(projectId, rfqWorkbook, mappings)
    : false;
  const disabled = !projectId || !hasMappings || isGenerating;

  useEffect(() => {
    if (!projectId || qcrIsCurrent) return;
    clearQcrStore();
  }, [projectId, qcrIsCurrent, clearQcrStore]);

  const handleClick = async () => {
    if (!projectId || disabled || qcrIsCurrent) return;
    try {
      await generateFromWorkstation(projectId);
      router.push(projectQcrWorkspacePath(projectId));
    } catch {
      /* error surfaced in center panel */
    }
  };

  if (!projectId) return null;

  if (qcrIsCurrent && loadQcrGenerationContext(projectId)) {
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
