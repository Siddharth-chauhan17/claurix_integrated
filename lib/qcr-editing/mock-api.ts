/**
 * Mock API for QCR editing workspace — swap for FastAPI without changing types/store.
 */

import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { alignWorkspaceSourcesWithRfq } from "./align-source-with-rfq";
import { AI_MOCK_CLAUSE_RESPONSE_WITH_SOURCE } from "./ai-mock-response";
import { buildQcrWorkspaceFromAiResponse } from "./normalize-ai-response";
import type { AiClauseComparisonRaw } from "./ai-mock-response";
import type { QcrWorkspace, QcrWorkspacePersistPayload } from "./types";
import { upgradeClausesToV2 } from "./upgrade-clause";

const LATENCY_MS = 450;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sessionKey(workspaceId: string): string {
  return `claurix:qcr-editing:${workspaceId}`;
}

/** True if at least one insurer cell has real proposal text (not an empty placeholder). */
function persistedHasFilledProposals(
  clauses: QcrWorkspacePersistPayload["clauses"]
): boolean {
  return clauses.some((clause) =>
    clause.comparisons.some((c) => c.proposal_clause.trim().length > 0)
  );
}

export function clearPersistedQcrWorkspace(workspaceId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(sessionKey(workspaceId));
}

/** GET workspace — normalized from AI clause-grouped JSON. */
export async function fetchQcrWorkspace(
  projectId: string,
  options?: { projectName?: string; clientName?: string }
): Promise<QcrWorkspace> {
  await delay(LATENCY_MS);

  let workspace = buildQcrWorkspaceFromAiResponse(
    AI_MOCK_CLAUSE_RESPONSE_WITH_SOURCE,
    {
      projectId,
      projectName: options?.projectName,
      clientName: options?.clientName,
    }
  );

  const wsStore = useProjectWorkspaceStore.getState();
  if (wsStore.projectId !== projectId) {
    useProjectWorkspaceStore.setState({ projectId });
  }
  if (!wsStore.hydrated || wsStore.projectId !== projectId) {
    useProjectWorkspaceStore.getState().hydrate(projectId);
  }
  await useProjectWorkspaceStore.getState().restoreRfqFileBlob(projectId);

  const { rfqWorkbook } = useProjectWorkspaceStore.getState();
  workspace = alignWorkspaceSourcesWithRfq(workspace, rfqWorkbook);

  const persisted = await loadPersistedQcrWorkspace(workspace.workspace_id);
  // Only restore broker saves that contain real comparison text — ignore stale
  // snapshots where every cell was saved as empty "Awaiting insurer terms" placeholders.
  if (
    persisted?.clauses?.length &&
    persistedHasFilledProposals(persisted.clauses)
  ) {
    return alignWorkspaceSourcesWithRfq(
      {
        ...workspace,
        clauses: upgradeClausesToV2(persisted.clauses),
      },
      rfqWorkbook
    );
  }

  return workspace;
}

/** Simulate AI returning fresh clause JSON (same normalizer as production). */
export async function fetchQcrWorkspaceFromAiRaw(
  projectId: string,
  rawClauses: AiClauseComparisonRaw[],
  options?: { projectName?: string; clientName?: string }
): Promise<QcrWorkspace> {
  await delay(LATENCY_MS);
  const wsStore = useProjectWorkspaceStore.getState();
  if (wsStore.projectId !== projectId) {
    useProjectWorkspaceStore.setState({ projectId });
  }
  if (!wsStore.hydrated || wsStore.projectId !== projectId) {
    useProjectWorkspaceStore.getState().hydrate(projectId);
  }
  await useProjectWorkspaceStore.getState().restoreRfqFileBlob(projectId);

  const workspace = buildQcrWorkspaceFromAiResponse(rawClauses, {
    projectId,
    projectName: options?.projectName,
    clientName: options?.clientName,
  });
  const { rfqWorkbook } = useProjectWorkspaceStore.getState();
  return alignWorkspaceSourcesWithRfq(workspace, rfqWorkbook);
}

/** Future: persist broker edits (mock acknowledges only). */
export async function saveQcrWorkspace(
  payload: QcrWorkspacePersistPayload
): Promise<{ success: boolean; saved_at: string }> {
  await delay(300);
  if (typeof window !== "undefined") {
    sessionStorage.setItem(sessionKey(payload.workspace_id), JSON.stringify(payload));
  }
  return { success: true, saved_at: payload.saved_at };
}

export async function loadPersistedQcrWorkspace(
  workspaceId: string
): Promise<QcrWorkspacePersistPayload | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(workspaceId));
    if (!raw) return null;
    return JSON.parse(raw) as QcrWorkspacePersistPayload;
  } catch {
    return null;
  }
}
