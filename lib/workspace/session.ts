import type { WorkspaceResponse } from "@/types/workspace";

const PREFIX = "claurix:qcr-workspace:";

export function workspaceSessionKey(projectId: string): string {
  return `${PREFIX}${projectId}`;
}

export function saveWorkspaceToSession(
  projectId: string,
  workspace: WorkspaceResponse
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    workspaceSessionKey(projectId),
    JSON.stringify(workspace)
  );
}

export function loadWorkspaceFromSession(
  projectId: string
): WorkspaceResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(workspaceSessionKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceResponse;
  } catch {
    return null;
  }
}

export function clearWorkspaceSession(projectId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(workspaceSessionKey(projectId));
}
