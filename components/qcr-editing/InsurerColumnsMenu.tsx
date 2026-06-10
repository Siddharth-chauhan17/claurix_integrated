"use client";

import { useEffect, useRef, useState } from "react";
import { useQcrEditingStore } from "@/lib/qcr-editing/workspace-store";
import { cn } from "@/lib/utils";

export function InsurerColumnsMenu() {
  const workspace = useQcrEditingStore((s) => s.workspace);
  const visibleInsurers = useQcrEditingStore((s) => s.ui.visibleInsurers);
  const toggleInsurerColumn = useQcrEditingStore((s) => s.toggleInsurerColumn);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const insurers = workspace?.insurers ?? [];
  const visibleCount = insurers.filter((i) => visibleInsurers[i] !== false).length;

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

  if (insurers.length === 0) return null;

  const summaryLabel =
    visibleCount === insurers.length
      ? `All (${insurers.length})`
      : `${visibleCount} of ${insurers.length}`;

  return (
    <div
      ref={rootRef}
      className="relative hidden items-center gap-2 border-l border-slate-200 pl-3 lg:flex"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Insurers
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
          open
            ? "border-emerald-400 bg-emerald-50 text-emerald-900"
            : "border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Toggle visible insurer columns"
      >
        {summaryLabel}
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
          aria-multiselectable="true"
          className="absolute left-0 top-full z-50 mt-1 min-w-[240px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Show in grid
            </p>
            <p className="text-xs text-slate-600">
              {visibleCount} column{visibleCount !== 1 ? "s" : ""} visible
            </p>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {insurers.map((insurer) => {
              const visible = visibleInsurers[insurer] !== false;
              return (
                <li key={insurer}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={visible}
                    onClick={() => toggleInsurerColumn(insurer)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                      visible
                        ? "bg-emerald-50 text-emerald-900 hover:bg-emerald-100/80"
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
                        visible
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent"
                      )}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span className={cn(!visible && "line-through opacity-70")}>
                      {insurer}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
