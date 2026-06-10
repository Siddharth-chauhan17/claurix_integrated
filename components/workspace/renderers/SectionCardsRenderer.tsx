"use client";

import { resolveVisibleClauses } from "@/lib/workspace-engine";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { SectionRenderer } from "./SectionRenderer";
import type { WorkspaceRendererProps } from "./types";

/** Wraps SectionRenderer with engine-filtered clause list. */
export function SectionCardsRenderer(props: WorkspaceRendererProps) {
  const filters = useWorkspaceStore((s) => s.filters);
  const visible = resolveVisibleClauses(
    props.workspace,
    props.section.section_id,
    filters
  );
  const visibleIds = new Set(visible.map((c) => c.clause_id));
  const filteredSection = {
    ...props.section,
    clauses: props.section.clauses.filter((c) => visibleIds.has(c.clause_id)),
  };

  return (
    <SectionRenderer
      workspace={props.workspace}
      section={filteredSection}
      activeClauseId={props.activeClauseId}
      config={props.config}
      callbacks={props.callbacks}
    />
  );
}
