"use client";

import { formatSourceTrace, getClauseById } from "@/lib/workspace-engine";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";

const RISK_STYLES: Record<string, string> = {
  low: "text-emerald-700 bg-emerald-50",
  medium: "text-amber-800 bg-amber-50",
  high: "text-orange-800 bg-orange-50",
  critical: "text-red-800 bg-red-50",
};

export function WorkspaceRightPanel() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const activeSectionId = useWorkspaceStore((s) => s.activeSectionId);
  const activeClauseId = useWorkspaceStore((s) => s.activeClauseId);
  const rightPanelOpen = useWorkspaceStore((s) => s.rightPanelOpen);

  if (!rightPanelOpen) return null;

  const section = workspace?.sections.find(
    (s) => s.section_id === activeSectionId
  );
  const clause =
    workspace && activeSectionId && activeClauseId
      ? getClauseById(workspace, activeSectionId, activeClauseId)
      : null;

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Clause insights</h2>
        <p className="text-xs text-slate-500">
          AI analysis & source traceability
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!clause ? (
          <p className="text-sm text-slate-500">
            Select a clause in the comparison view.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900">{clause.title}</h3>
              <p className="text-xs capitalize text-slate-500">
                {clause.category} · {clause.comparison_type}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                Insurer values
              </p>
              <ul className="mt-2 space-y-2">
                {clause.values.map((v) => (
                  <li
                    key={v.insurer}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-600">{v.insurer}</span>
                    <p className="text-slate-900">{v.value}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                AI analysis
              </p>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  RISK_STYLES[clause.ai_analysis.risk_level]
                )}
              >
                {clause.ai_analysis.risk_level}
              </span>
              <p className="mt-2 text-sm text-slate-700">
                {clause.ai_analysis.summary}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                Recommendation
              </p>
              <p className="text-sm text-slate-600">
                {clause.ai_analysis.recommendation}
              </p>
            </div>

            {section && section.source_trace.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400">
                  Source trace
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                  {section.source_trace.map((t, i) => (
                    <li
                      key={`${t.document_id}-${i}`}
                      className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5 font-mono"
                    >
                      {formatSourceTrace(t)}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] text-slate-400">
                  Jump-to-source and audit trails ship in a later release.
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">
                Comments
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {clause.comments.length === 0
                  ? "No comments yet."
                  : `${clause.comments.length} comment(s)`}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
