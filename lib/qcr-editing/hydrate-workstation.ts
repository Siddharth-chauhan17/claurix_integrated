/**
 * Shared workstation hydration before QCR editing (RFQ blob + local state).
 */

import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

export async function hydrateWorkstationForQcr(projectId: string): Promise<void> {
  const wsStore = useProjectWorkspaceStore.getState();
  if (wsStore.projectId !== projectId) {
    useProjectWorkspaceStore.setState({ projectId });
  }
  if (!wsStore.hydrated || wsStore.projectId !== projectId) {
    useProjectWorkspaceStore.getState().hydrate(projectId);
  }
  await useProjectWorkspaceStore.getState().restoreRfqFileBlob(projectId);
}
