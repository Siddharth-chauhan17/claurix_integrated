/**
 * QCR editing workspace loader — backend gap-analysis first, mock fallback.
 * Broker edits: server Postgres first, sessionStorage fallback.
 */

import {
  fetchQcrEditingWorkspace,
  saveQcrEditingWorkspace,
} from "@/lib/api";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import { alignWorkspaceSourcesWithRfq } from "./align-source-with-rfq";
import { AI_MOCK_CLAUSE_RESPONSE_WITH_SOURCE } from "./ai-mock-response";
import { hydrateWorkstationForQcr } from "./hydrate-workstation";
import { buildQcrWorkspaceFromAiResponse } from "./normalize-ai-response";
import type { AiClauseComparisonRaw } from "./ai-mock-response";
import type {
  ClauseComparison,
  QcrWorkspace,
  QcrWorkspacePersistPayload,
} from "./types";
import { upgradeClausesToV2 } from "./upgrade-clause";
import { toast } from "react-toastify";

const LATENCY_MS = 200;

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

function brokerPayloadFromApi(api: {
  workspace_id: string;
  broker_clauses?: Array<Record<string, unknown>> | null;
  broker_saved_at?: string | null;
  broker_saved_by?: string | null;
}): QcrWorkspacePersistPayload | null {
  if (!api.broker_clauses?.length) return null;
  return {
    workspace_id: api.workspace_id,
    clauses: api.broker_clauses as ClauseComparison[],
    saved_at: api.broker_saved_at ?? new Date().toISOString(),
    saved_by: api.broker_saved_by ?? undefined,
  };
}

export function clearPersistedQcrWorkspace(workspaceId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(sessionKey(workspaceId));
}

async function loadEditingWorkspaceFromBackend(
  projectId: string
): Promise<{
  raw: AiClauseComparisonRaw[] | null;
  broker: QcrWorkspacePersistPayload | null;
  meta: {
    workspaceId: string;
    insurers: string[];
    sections: { id: string; label: string }[];
    rfqFileName?: string;
    generatedAt?: string;
  };
} | null> {
  try {
    const api = await fetchQcrEditingWorkspace(projectId);
    const broker = brokerPayloadFromApi(api);
    const raw =
      api.source === "gap_analysis" && api.clauses?.length
        ? (api.clauses as AiClauseComparisonRaw[])
        : null;

    return {
      raw,
      broker,
      meta: {
        workspaceId: api.workspace_id,
        insurers: api.insurers,
        sections: api.sections,
        rfqFileName: api.rfq_file_name ?? undefined,
        generatedAt: api.generated_at ?? undefined,
      },
    };
  } catch {
    return null;
  }
}

function buildWorkspace(
  projectId: string,
  rawClauses: AiClauseComparisonRaw[],
  options?: {
    projectName?: string;
    clientName?: string;
    workspaceId?: string;
    insurers?: string[];
    sections?: { id: string; label: string }[];
    rfqFileName?: string;
    generatedAt?: string;
  }
): QcrWorkspace {
  const ws = useProjectWorkspaceStore.getState();
  const rfqFileName =
    options?.rfqFileName ?? ws.rfqWorkbook?.fileName ?? undefined;

  return buildQcrWorkspaceFromAiResponse(rawClauses, {
    projectId,
    projectName: options?.projectName,
    clientName: options?.clientName,
    workspaceId: options?.workspaceId,
    insurers: options?.insurers,
    sections: options?.sections,
    rfqFileName,
    generatedAt: options?.generatedAt,
  });
}

async function finalizeWorkspace(
  workspace: QcrWorkspace,
  serverBroker?: QcrWorkspacePersistPayload | null
): Promise<QcrWorkspace> {
  const { rfqWorkbook } = useProjectWorkspaceStore.getState();
  let aligned = alignWorkspaceSourcesWithRfq(workspace, rfqWorkbook);

  if (serverBroker?.clauses?.length) {
    return alignWorkspaceSourcesWithRfq(
      {
        ...aligned,
        clauses: upgradeClausesToV2(serverBroker.clauses),
      },
      rfqWorkbook
    );
  }

  const persisted = await loadPersistedQcrWorkspace(aligned.workspace_id);
  if (
    persisted?.clauses?.length &&
    persistedHasFilledProposals(persisted.clauses)
  ) {
    aligned = alignWorkspaceSourcesWithRfq(
      {
        ...aligned,
        clauses: upgradeClausesToV2(persisted.clauses),
      },
      rfqWorkbook
    );
  }

  return aligned;
}

/** GET workspace — gap-analysis from API when available, else mock clauses. */
export async function fetchQcrWorkspace(
  projectId: string,
  options?: { projectName?: string; clientName?: string }
): Promise<QcrWorkspace> {
  await delay(LATENCY_MS);
  await hydrateWorkstationForQcr(projectId);

  const fromApi = await loadEditingWorkspaceFromBackend(projectId);
  const rawClauses = fromApi?.raw ?? AI_MOCK_CLAUSE_RESPONSE_WITH_SOURCE;

  const workspace = buildWorkspace(projectId, rawClauses, {
    projectName: options?.projectName,
    clientName: options?.clientName,
    workspaceId: fromApi?.meta.workspaceId,
    insurers: fromApi?.meta.insurers,
    sections: fromApi?.meta.sections,
    rfqFileName: fromApi?.meta.rfqFileName,
    generatedAt: fromApi?.meta.generatedAt,
  });

  return finalizeWorkspace(workspace, fromApi?.broker);
}

/** Build workspace from explicit raw AI JSON (tests / tooling). */
export async function fetchQcrWorkspaceFromAiRaw(
  projectId: string,
  rawClauses: AiClauseComparisonRaw[],
  options?: { projectName?: string; clientName?: string }
): Promise<QcrWorkspace> {
  await delay(LATENCY_MS);
  await hydrateWorkstationForQcr(projectId);

  const workspace = buildWorkspace(projectId, rawClauses, {
    projectName: options?.projectName,
    clientName: options?.clientName,
  });
  return finalizeWorkspace(workspace);
}

/** Persist broker edits — server first, sessionStorage fallback. */
export async function saveQcrWorkspace(
  payload: QcrWorkspacePersistPayload & { project_id: string }
): Promise<{ success: boolean; saved_at: string }> {
  await delay(300);

  const writeSession = (savedAt: string, savedBy?: string) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      sessionKey(payload.workspace_id),
      JSON.stringify({
        workspace_id: payload.workspace_id,
        clauses: payload.clauses,
        saved_at: savedAt,
        saved_by: savedBy,
      })
    );
  };

  try {
    const res = await saveQcrEditingWorkspace(payload.project_id, {
      workspace_id: payload.workspace_id,
      clauses: payload.clauses as Array<Record<string, unknown>>,
      saved_at: payload.saved_at,
    });
    writeSession(res.saved_at, res.saved_by);
    return { success: true, saved_at: res.saved_at };
  } catch (err) {
    writeSession(payload.saved_at);
    toast.warn(
      err instanceof Error
        ? `Edits saved locally only: ${err.message}`
        : "Edits saved locally only; server save failed."
    );
    return { success: true, saved_at: payload.saved_at };
  }
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
