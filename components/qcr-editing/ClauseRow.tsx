"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  const deleteClause = useQcrEditingStore((s) => s.deleteClause);

  const isActive = activeClauseId === clause.clause_id;
  const isDirty = dirtyIds.includes(clause.clause_id);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
    <div
      role="row"
      className={cn(
        "relative grid border-b border-slate-200 pb-7 transition-colors",
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmDelete(true);
        }}
        title={`Delete ${clause.rfq_clause}`}
        aria-label={`Delete ${clause.rfq_clause}`}
        className="absolute bottom-1.5 left-1.5 z-[1] flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
    <ConfirmDialog
      open={confirmDelete}
      title="Delete clause row?"
      message={`Remove "${clause.rfq_clause}" from this comparison? This cannot be undone after you save.`}
      confirmLabel="Yes, delete"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={() => {
        deleteClause(clause.clause_id);
        setConfirmDelete(false);
      }}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  );
}
