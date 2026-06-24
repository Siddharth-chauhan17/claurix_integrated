/**
 * Tracks which RFQ upload + policy mappings a QCR generation belongs to.
 * When the user removes/re-uploads the RFQ or changes mappings, prior results are invalid.
 */

import { clearRemarkDraftsFromSession } from "@/lib/qcr-editing/remark-draft-storage";
import type { PolicyMapping, RfqWorkbook } from "@/types/project-workspace";
import { clearWorkspaceSession } from "./session";

const PREFIX = "claurix:qcr-generation-context:";

export type QcrGenerationContext = {
  rfqUploadedAt: string;
  rfqFileName: string;
  mappingFingerprint: string;
  workspaceId: string;
  generatedAt: string;
};

export function mappingFingerprint(mappings: PolicyMapping[]): string {
  const normalized = [...mappings]
    .map((m) => ({
      sheet_name: m.sheet_name,
      start_row: m.start_row,
      end_row: m.end_row,
      policy_line: m.policy_line,
    }))
    .sort((a, b) =>
      `${a.sheet_name}:${a.start_row}:${a.policy_line}`.localeCompare(
        `${b.sheet_name}:${b.start_row}:${b.policy_line}`
      )
    );
  return JSON.stringify(normalized);
}

function contextKey(projectId: string): string {
  return `${PREFIX}${projectId}`;
}

export function loadQcrGenerationContext(
  projectId: string
): QcrGenerationContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(contextKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as QcrGenerationContext;
  } catch {
    return null;
  }
}

export function saveQcrGenerationContext(
  projectId: string,
  context: QcrGenerationContext
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(contextKey(projectId), JSON.stringify(context));
}

export function clearQcrGenerationContext(projectId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(contextKey(projectId));
}

export function isQcrGenerationCurrent(
  projectId: string,
  rfqWorkbook: RfqWorkbook | null,
  mappings: PolicyMapping[]
): boolean {
  const saved = loadQcrGenerationContext(projectId);
  if (!saved || !rfqWorkbook) return false;
  if (saved.rfqUploadedAt !== rfqWorkbook.uploadedAt) return false;
  if (saved.rfqFileName !== rfqWorkbook.fileName) return false;
  if (saved.mappingFingerprint !== mappingFingerprint(mappings)) return false;
  return true;
}

/** Drop cached QCR session/editing data for a project (does not touch workstation uploads). */
export function invalidateQcrGeneration(projectId: string): void {
  const saved = loadQcrGenerationContext(projectId);
  clearQcrGenerationContext(projectId);
  clearWorkspaceSession(projectId);
  clearRemarkDraftsFromSession(projectId);
  if (saved?.workspaceId && typeof window !== "undefined") {
    sessionStorage.removeItem(`claurix:qcr-editing:${saved.workspaceId}`);
  }
}
