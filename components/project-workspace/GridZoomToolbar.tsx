"use client";

import { useEffect, useRef, useState } from "react";
import { GRID_ZOOM_MAX } from "@/lib/project-workspace/measureGridFitZoom";
import { cn } from "@/lib/utils";

type Props = {
  zoom: number;
  minZoom: number;
  onZoomChange: (zoom: number) => void;
  columnCount: number;
  rowCount: number;
  headerRowIndex: number | null;
};

function formatZoomLabel(zoom: number, minZoom: number): string {
  const pct = Math.round(zoom * 100);
  if (Math.abs(zoom - minZoom) < 0.005 && minZoom < 0.995) {
    return `Fit (${pct}%)`;
  }
  return `${pct}%`;
}

export function GridZoomToolbar({
  zoom,
  minZoom,
  onZoomChange,
  columnCount,
  rowCount,
  headerRowIndex,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const fitLabel =
    minZoom < 0.995 ? `${Math.round(minZoom * 100)}% (fit)` : "100%";

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/90 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
        <span>
          <span className="font-medium text-slate-800">{rowCount}</span> rows
        </span>
        <span className="text-slate-300">·</span>
        <span>
          <span className="font-medium text-slate-800">{columnCount}</span> columns
          shown
        </span>
        {headerRowIndex != null ? (
          <>
            <span className="text-slate-300">·</span>
            <span>
              Header row{" "}
              <span className="font-medium text-slate-800">{headerRowIndex}</span>
            </span>
          </>
        ) : null}
      </div>

      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition",
            open
              ? "border-primary-300 bg-primary-50 text-primary-800"
              : "text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Zoom
          </span>
          <span>{formatZoomLabel(zoom, minZoom)}</span>
        </button>

        {open ? (
          <div
            role="dialog"
            aria-label="Zoom control"
            className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between text-[11px] text-slate-500">
              <span>{fitLabel}</span>
              <span>125%</span>
            </div>
            <input
              type="range"
              min={minZoom}
              max={GRID_ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={(e) => onZoomChange(Number.parseFloat(e.target.value))}
              className="pw-zoom-slider w-full cursor-pointer"
              aria-valuemin={Math.round(minZoom * 100)}
              aria-valuemax={125}
              aria-valuenow={Math.round(zoom * 100)}
              aria-label="Zoom level"
            />
            <p className="mt-3 text-center text-sm font-semibold text-slate-800">
              {formatZoomLabel(zoom, minZoom)}
            </p>
            <p className="mt-1 text-center text-[10px] text-slate-500">
              Left: fit sheet to screen · Right: 125%
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
