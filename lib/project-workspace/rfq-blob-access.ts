/**
 * Resolves the RFQ workbook blob for Source verification.
 * Priority: in-memory store → IndexedDB (persisted upload).
 * Never reads insurer quote files.
 */

import { loadRfqBlob } from "./rfq-blob-storage";

const inflightByProject = new Map<string, Promise<Blob | null>>();
const memoryCacheByProject = new Map<string, Blob>();

/** Register blob already in Zustand (avoids redundant IDB reads). */
export function registerRfqBlobInMemory(projectId: string, blob: Blob | null): void {
  if (blob) {
    memoryCacheByProject.set(projectId, blob);
  } else {
    memoryCacheByProject.delete(projectId);
  }
}

/**
 * Returns the RFQ file blob for a project.
 * 1. In-memory (Zustand / cache)
 * 2. IndexedDB restore
 */
export async function resolveRfqBlobForProject(
  projectId: string | null | undefined,
  memoryBlob: Blob | null
): Promise<Blob | null> {
  if (!projectId) return memoryBlob;

  if (memoryBlob) {
    memoryCacheByProject.set(projectId, memoryBlob);
    return memoryBlob;
  }

  const cached = memoryCacheByProject.get(projectId);
  if (cached) return cached;

  const inflight = inflightByProject.get(projectId);
  if (inflight) return inflight;

  const promise = loadRfqBlob(projectId)
    .then((stored) => {
      const blob = stored?.blob ?? null;
      if (blob) memoryCacheByProject.set(projectId, blob);
      return blob;
    })
    .finally(() => {
      inflightByProject.delete(projectId);
    });

  inflightByProject.set(projectId, promise);
  return promise;
}

export function clearRfqBlobMemoryCache(projectId?: string): void {
  if (projectId) {
    memoryCacheByProject.delete(projectId);
    inflightByProject.delete(projectId);
    return;
  }
  memoryCacheByProject.clear();
  inflightByProject.clear();
}
