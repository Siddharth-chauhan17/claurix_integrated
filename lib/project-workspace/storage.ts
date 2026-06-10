import type { PersistedWorkspaceState } from "@/types/project-workspace";

const PREFIX = "claurix:project-workspace:";

export function workspaceStorageKey(projectId: string): string {
  return `${PREFIX}${projectId}`;
}

export function loadPersistedWorkspace(
  projectId: string
): PersistedWorkspaceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(workspaceStorageKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedWorkspaceState;
  } catch {
    return null;
  }
}

export function savePersistedWorkspace(
  projectId: string,
  state: PersistedWorkspaceState
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(workspaceStorageKey(projectId), JSON.stringify(state));
}
