/**
 * Typed client for QCR workspace orchestration.
 * Frontend depends on WorkspacePayload/WorkspaceResponse — not prompt structure.
 */

import type { WorkspacePayload, WorkspaceResponse } from "@/types/workspace";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const err = await res.json();
    if (typeof err.detail === "string") return err.detail;
    if (Array.isArray(err.detail))
      return err.detail.map((d: { msg?: string }) => d.msg).join(", ");
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * POST /projects/{projectId}/generate-qcr
 * Returns semantic workspace JSON from backend orchestration (mock AI today).
 */
export async function generateQcr(
  projectId: string,
  payload: WorkspacePayload
): Promise<WorkspaceResponse> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/generate-qcr`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      }
    );
  } catch {
    throw new Error(
      `Cannot reach API at ${API_BASE_URL}. Is the backend running? (docker compose up -d api)`
    );
  }
  if (!res.ok) {
    const detail = await parseApiError(res, "Failed to generate QCR workspace");
    if (res.status === 404) {
      throw new Error(
        `${detail} — rebuild the API after backend changes: docker compose build api && docker compose up -d api`
      );
    }
    if (res.status === 401) {
      throw new Error("Not signed in. Log in again, then retry Generate QCR.");
    }
    throw new Error(detail);
  }
  return res.json() as Promise<WorkspaceResponse>;
}
