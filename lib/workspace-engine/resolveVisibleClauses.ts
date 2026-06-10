import type { Clause, WorkspaceResponse } from "@/types/workspace";
import type { WorkspaceFilters } from "./types";
import { filterClauses } from "./filterClauses";
import { getClausesForSection } from "./getClausesForSection";
import { searchClauses } from "./searchClauses";
import { sortClauses } from "./sortClauses";

/** Pipeline used by renderers: filter → search → sort (engine-owned, not AG Grid). */
export function resolveVisibleClauses(
  workspace: WorkspaceResponse,
  sectionId: string,
  filters: WorkspaceFilters
): Clause[] {
  const base = getClausesForSection(workspace, sectionId);
  const filtered = filterClauses(base, filters);
  const searched = searchClauses(filtered, filters.search);
  return sortClauses(searched, "title");
}
