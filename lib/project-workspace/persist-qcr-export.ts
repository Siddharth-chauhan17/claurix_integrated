import {
  loadPersistedWorkspace,
  savePersistedWorkspace,
} from "@/lib/project-workspace/storage";
import { saveQcrExportBlob } from "@/lib/project-workspace/qcr-export-storage";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import type { QcrExportRef } from "@/types/project-workspace";

/** Save exported QCR workbook for workstation sidebar download. */
export async function persistQcrExport(
  projectId: string,
  blob: Blob,
  fileName: string
): Promise<QcrExportRef> {
  const stored = await saveQcrExportBlob(projectId, blob, fileName);
  const ref: QcrExportRef = {
    fileName: stored.fileName,
    exportedAt: stored.exportedAt,
  };

  const existing = loadPersistedWorkspace(projectId);
  savePersistedWorkspace(projectId, {
    currentStage: existing?.currentStage ?? "document-upload",
    sidebarCollapsed: existing?.sidebarCollapsed ?? false,
    rfqWorkbook: existing?.rfqWorkbook ?? null,
    quoteFiles: existing?.quoteFiles ?? [],
    activeSheetName: existing?.activeSheetName ?? null,
    mappings: existing?.mappings ?? [],
    qcrExport: ref,
  });

  const ws = useProjectWorkspaceStore.getState();
  if (ws.projectId === projectId) {
    useProjectWorkspaceStore.setState({
      qcrExport: ref,
      qcrExportBlob: stored.blob,
    });
  }

  return ref;
}
