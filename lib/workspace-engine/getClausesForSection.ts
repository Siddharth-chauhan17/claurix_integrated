import type { Clause, WorkspaceResponse } from "@/types/workspace";
import { getSectionById } from "./getSectionById";

export function getClausesForSection(
  workspace: WorkspaceResponse,
  sectionId: string
): Clause[] {
  return getSectionById(workspace, sectionId)?.clauses ?? [];
}
