/**
 * Browser persistence for insurer remark drafts (Unsaved dropdown).
 * Survives page reload within the same tab (sessionStorage).
 */

import type { InsurerRemarkDraft } from "./remark-drafts";

const PREFIX = "claurix:qcr-remark-drafts:";

function storageKey(projectId: string): string {
  return `${PREFIX}${projectId}`;
}

export function loadRemarkDraftsFromSession(
  projectId: string
): InsurerRemarkDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InsurerRemarkDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRemarkDraftsToSession(
  projectId: string,
  drafts: readonly InsurerRemarkDraft[]
): void {
  if (typeof window === "undefined") return;
  const key = storageKey(projectId);
  if (drafts.length === 0) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, JSON.stringify(drafts));
}

export function clearRemarkDraftsFromSession(projectId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKey(projectId));
}

/** Drop drafts whose clause no longer exists in the loaded workspace. */
export function filterRemarkDraftsForClauses(
  drafts: readonly InsurerRemarkDraft[],
  clauseIds: ReadonlySet<string>
): InsurerRemarkDraft[] {
  return drafts.filter((d) => clauseIds.has(d.clause_id));
}
