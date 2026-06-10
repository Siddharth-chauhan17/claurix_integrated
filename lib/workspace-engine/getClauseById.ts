import type { Clause, WorkspaceResponse } from "@/types/workspace";
import { getSectionById } from "./getSectionById";

export function getClauseById(
  workspace: WorkspaceResponse,
  sectionId: string,
  clauseId: string
): Clause | undefined {
  const section = getSectionById(workspace, sectionId);
  return section?.clauses.find((c) => c.clause_id === clauseId);
}
