"use client";

import { useState } from "react";
import { getInsurerComparison } from "@/lib/qcr-editing/selectors";
import type { ClauseComparison } from "@/lib/qcr-editing/types";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";
import { ClauseSourceButton } from "./ClauseSourcePopover";
import { InsurerCell } from "./InsurerCell";

export function ClauseRow({
  clause,
  insurers,
  rowIndex,
  gridCols,
}: {
  clause: ClauseComparison;
  insurers: string[];
  rowIndex: number;
  gridCols: string;
}) {
  const activeClauseId = useQcrEditingStore((s) => s.ui.activeClauseId);
  const activeInsurer = useQcrEditingStore((s) => s.ui.activeInsurer);
  const dirtyIds = useQcrEditingStore((s) => s.draft.dirtyClauseIds);
  const setActiveClause = useQcrEditingStore((s) => s.setActiveClause);
  const setActiveInsurer = useQcrEditingStore((s) => s.setActiveInsurer);

  const isActive = activeClauseId === clause.clause_id;
  const isDirty = dirtyIds.includes(clause.clause_id);
  const [sourceOpen, setSourceOpen] = useState(false);

  return (
    <div
      role="row"
      className={cn(
        "grid border-b border-slate-200 transition-colors",
        rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40",
        isActive && "bg-primary-50/30"
      )}
      style={{ gridTemplateColumns: gridCols }}
    >
      <div
        role="cell"
        className="border-r border-slate-100 p-3"
        onClick={() => setActiveClause(clause.clause_id)}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
            {clause.rfq_clause}
          </p>
          {clause.source ? (
            <ClauseSourceButton
              source={clause.source}
              open={sourceOpen}
              onToggle={() => setSourceOpen((prev) => !prev)}
            />
          ) : null}
        </div>
        {isDirty ? (
          <span className="mt-1 inline-block text-[10px] font-medium text-amber-700">
            Unsaved edits
          </span>
        ) : null}
      </div>
      <div
        role="cell"
        className="cursor-pointer border-r border-slate-100 p-3"
        onClick={() => setActiveClause(clause.clause_id)}
      >
        <p className="line-clamp-4 text-xs leading-relaxed text-slate-600">
          {clause.rfq_requirement}
        </p>
      </div>
      {insurers.map((insurer) => {
        const comparison = getInsurerComparison(clause, insurer);
        if (!comparison) {
          return (
            <div
              key={insurer}
              className="border-l border-slate-100 p-3 text-xs text-slate-400"
            >
              —
            </div>
          );
        }
        return (
          <div key={insurer} role="cell" className="min-h-[120px] p-0">
            <InsurerCell
              comparison={comparison}
              selected={
                isActive &&
                activeInsurer === insurer
              }
              onSelect={() => {
                setActiveClause(clause.clause_id);
                setActiveInsurer(insurer);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
