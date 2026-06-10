import type { PolicySection, WorkspaceResponse } from "@/types/workspace";

export function getSectionById(
  workspace: WorkspaceResponse,
  sectionId: string
): PolicySection | undefined {
  return workspace.sections.find((s) => s.section_id === sectionId);
}
