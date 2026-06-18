/**
 * Holds generated workspace JSON — no editing UI yet.
 * Wire "Generate QCR" from workstation when the review workspace ships.
 */

import { create } from "zustand";
import { buildWorkspacePayload } from "@/lib/workspace/buildWorkspacePayload";
import {
  mappingFingerprint,
  saveQcrGenerationContext,
} from "@/lib/workspace/qcr-generation-context";
import { validateWorkstationForQcrGeneration } from "@/lib/workspace/validate-generation";
import { saveWorkspaceToSession } from "@/lib/workspace/session";
import { generateQcr } from "@/lib/workspace/workspace-api";
import type { WorkspacePayload, WorkspaceResponse } from "@/types/workspace";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

type QcrWorkspaceState = {
  payload: WorkspacePayload | null;
  response: WorkspaceResponse | null;
  isGenerating: boolean;
  error: string | null;
  generateFromWorkstation: (projectId: string) => Promise<WorkspaceResponse>;
  clear: () => void;
};

export const useQcrWorkspaceStore = create<QcrWorkspaceState>((set) => ({
  payload: null,
  response: null,
  isGenerating: false,
  error: null,

  clear: () =>
    set({ payload: null, response: null, error: null, isGenerating: false }),

  generateFromWorkstation: async (projectId: string) => {
    const ws = useProjectWorkspaceStore.getState();
    if (ws.projectId !== projectId) {
      throw new Error("Workstation not initialized for this project");
    }

    set({ isGenerating: true, error: null });
    try {
      const validationError = validateWorkstationForQcrGeneration(
        ws.rfqWorkbook,
        ws.quoteFiles,
        ws.mappings
      );
      if (validationError) {
        set({ isGenerating: false, error: validationError });
        throw new Error(validationError);
      }

      const payload = buildWorkspacePayload({
        projectId,
        projectName: ws.projectName,
        clientName: ws.clientName,
        rfqWorkbook: ws.rfqWorkbook,
        quoteFiles: ws.quoteFiles,
        mappings: ws.mappings,
      });
      const response = await generateQcr(projectId, payload);
      saveWorkspaceToSession(projectId, response);
      if (ws.rfqWorkbook) {
        saveQcrGenerationContext(projectId, {
          rfqUploadedAt: ws.rfqWorkbook.uploadedAt,
          rfqFileName: ws.rfqWorkbook.fileName,
          mappingFingerprint: mappingFingerprint(ws.mappings),
          workspaceId: response.workspace_id,
          generatedAt: response.generated_at,
        });
      }
      set({ payload, response, isGenerating: false });
      return response;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to generate QCR workspace";
      set({ isGenerating: false, error: message });
      throw e;
    }
  },
}));
