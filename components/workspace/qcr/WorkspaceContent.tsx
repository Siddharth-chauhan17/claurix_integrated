"use client";

import { useMemo } from "react";
import {
  buildComparisonMatrix,
  getSectionById,
  resolveVisibleClauses,
} from "@/lib/workspace-engine";
import {
  RendererProvider,
  useRendererContext,
} from "@/components/workspace/renderers/RendererProvider";
import { useWorkspaceStore } from "@/stores/workspace-store";

function WorkspaceRendererViewport() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeSectionId = useWorkspaceStore((s) => s.activeSectionId);
  const activeClauseId = useWorkspaceStore((s) => s.activeClauseId);
  const filters = useWorkspaceStore((s) => s.filters);
  const rendererMode = useWorkspaceStore((s) => s.rendererMode);
  const setActiveClause = useWorkspaceStore((s) => s.setActiveClause);
  const { Renderer } = useRendererContext();

  const section = useMemo(() => {
    if (!workspace || !activeSectionId) return null;
    return getSectionById(workspace, activeSectionId) ?? null;
  }, [workspace, activeSectionId]);

  const visibleClauses = useMemo(() => {
    if (!workspace || !activeSectionId) return [];
    return resolveVisibleClauses(workspace, activeSectionId, filters);
  }, [workspace, activeSectionId, filters]);

  const matrix = useMemo(() => {
    if (!workspace || !activeSectionId) return null;
    const full = buildComparisonMatrix(workspace, activeSectionId);
    if (!full) return null;
    const ids = new Set(visibleClauses.map((c) => c.clause_id));
    return {
      ...full,
      rows: full.rows.filter((r) => ids.has(r.clause_id)),
    };
  }, [workspace, activeSectionId, visibleClauses]);

  if (!workspace || !section || !Renderer) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Select a policy section to begin.
      </div>
    );
  }

  return (
    <Renderer
      workspace={workspace}
      section={section}
      matrix={matrix}
      visibleClauseIds={visibleClauses.map((c) => c.clause_id)}
      activeClauseId={activeClauseId}
      config={{ mode: rendererMode, readOnly: true }}
      callbacks={{
        onSelectClause: (id) => setActiveClause(id),
      }}
    />
  );
}

export function WorkspaceContent() {
  const rendererMode = useWorkspaceStore((s) => s.rendererMode);

  return (
    <div className="min-h-0 flex-1 bg-[#fafbfc] p-3">
      <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <RendererProvider mode={rendererMode}>
          <WorkspaceRendererViewport />
        </RendererProvider>
      </div>
    </div>
  );
}
