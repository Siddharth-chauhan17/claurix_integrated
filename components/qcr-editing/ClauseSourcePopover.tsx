"use client";

import { useClauseSourceValue } from "@/lib/qcr-editing/use-clause-source-value";
import type { ClauseSource } from "@/lib/qcr-editing/types";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";

type ClauseSourcePopoverProps = {
  source: ClauseSource;
  open: boolean;
  onToggle: () => void;
};

export function ClauseSourceButton({
  source,
  open,
  onToggle,
}: ClauseSourcePopoverProps) {
  const projectId = useQcrEditingStore((s) => s.workspace?.meta.project_id);
  const { value, loading } = useClauseSourceValue(source, projectId, open);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
          open
            ? "bg-primary-100 text-primary-800"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Source
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Original source"
          className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Original Source
          </p>
          <p className="mt-2 text-sm leading-snug text-slate-900">
            {loading ? (
              <span className="text-slate-400">Loading…</span>
            ) : (
              value?.trim() || "—"
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}
