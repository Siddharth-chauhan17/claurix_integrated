"use client";

import { useEffect, useRef, useState } from "react";
import {
  useQcrEditingStore,
  useRemarkDrafts,
} from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";

/** Dropdown to the right of workspace view tabs — visible only when remark drafts exist. */
export function UnsavedChangesMenu() {
  const remarkDrafts = useRemarkDrafts();
  const openRemarkDraft = useQcrEditingStore((s) => s.openRemarkDraft);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const sortedDrafts = [...remarkDrafts].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const count = sortedDrafts.length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (count === 0) return null;

  return (
    <div ref={rootRef} className="relative ml-2 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition",
          open
            ? "border-amber-400 bg-amber-50 text-amber-900"
            : "border-amber-300 bg-amber-50/90 text-amber-800 hover:bg-amber-100"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
        Unsaved
        <svg
          className={cn("h-3.5 w-3.5 transition", open && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Pending insurer remarks
            </p>
            <p className="text-xs text-slate-600">Open to save or discard</p>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {sortedDrafts.map((draft, index) => (
              <li key={`${draft.clause_id}:${draft.insurer}`}>
                <button
                  type="button"
                  role="option"
                  onClick={() => {
                    openRemarkDraft(draft);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-primary-50"
                >
                  <span className="text-xs font-semibold text-slate-900">
                    {index === 0 ? (
                      <span className="mr-1 text-[10px] font-bold uppercase text-primary-600">
                        Next ·
                      </span>
                    ) : null}
                    {draft.rfq_clause}
                  </span>
                  <span className="text-[11px] text-slate-500">{draft.insurer}</span>
                  <span className="line-clamp-1 text-[10px] text-amber-700">
                    Draft differs from saved
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
