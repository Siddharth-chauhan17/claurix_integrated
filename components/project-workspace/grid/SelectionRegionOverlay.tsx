"use client";

import type { GridApi } from "ag-grid-community";
import { useCallback, useEffect, useState } from "react";
import {
  getSelectionClientBounds,
  getSelectionOverlayFromApi,
} from "@/lib/workspace-interaction/gridSelectionBounds";
import { normalizeRange } from "@/lib/workspace-interaction/rowRangeSelection";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

type FixedBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  containerRef: React.RefObject<HTMLElement | null>;
  gridApiRef: React.RefObject<GridApi | null>;
};

export function SelectionRegionOverlay({ containerRef, gridApiRef }: Props) {
  const selectedRange = useProjectWorkspaceStore((s) => s.selectedRange);
  const isSelecting = useProjectWorkspaceStore((s) => s.isSelecting);
  const assignMenu = useProjectWorkspaceStore((s) => s.assignMenu);
  const beginResizeSelection = useProjectWorkspaceStore((s) => s.beginResizeSelection);

  const [bounds, setBounds] = useState<FixedBounds | null>(null);

  const paint = useCallback(() => {
    const range = useProjectWorkspaceStore.getState().selectedRange;
    const container = containerRef.current;
    const api = gridApiRef.current;
    if (!range || !container) {
      setBounds(null);
      return;
    }

    const client = getSelectionClientBounds(container, range);
    if (client) {
      setBounds({
        top: client.top,
        left: client.left,
        width: client.width,
        height: client.height,
      });
      return;
    }

    const fromApi = api ? getSelectionOverlayFromApi(api, range, container) : null;
    if (fromApi) {
      setBounds(fromApi);
      return;
    }

    setBounds(null);
  }, [containerRef, gridApiRef]);

  useEffect(() => {
    if (!selectedRange) {
      setBounds(null);
      return;
    }

    let raf = 0;
    function loop() {
      paint();
      raf = requestAnimationFrame(loop);
    }

    paint();
    if (isSelecting) {
      raf = requestAnimationFrame(loop);
    }

    const container = containerRef.current;
    const viewport = container?.querySelector(".ag-body-viewport");
    viewport?.addEventListener("scroll", paint, { passive: true });
    window.addEventListener("resize", paint);

    return () => {
      cancelAnimationFrame(raf);
      viewport?.removeEventListener("scroll", paint);
      window.removeEventListener("resize", paint);
    };
  }, [selectedRange, isSelecting, paint, containerRef]);

  if (!selectedRange || !bounds) return null;

  const range = normalizeRange(selectedRange.start, selectedRange.end);
  const showHandles = !isSelecting && !assignMenu;

  return (
    <div
      className="pw-selection-region pointer-events-none"
      style={{
        position: "fixed",
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        height: bounds.height,
        zIndex: 25,
      }}
      aria-hidden={false}
    >
      <div
        className={cn(
          "pw-selection-band__fill h-full w-full",
          isSelecting && "pw-selection-band__fill--dragging"
        )}
      />
      <div className="pw-selection-band__accent" />
      <div className="pw-selection-band__edge pw-selection-band__edge--top" />
      <div className="pw-selection-band__edge pw-selection-band__edge--bottom" />

      {showHandles ? (
        <>
          <button
            type="button"
            className="pw-selection-handle pw-selection-handle--top pointer-events-auto"
            aria-label="Adjust top boundary"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              beginResizeSelection("start");
            }}
          />
          <button
            type="button"
            className="pw-selection-handle pw-selection-handle--bottom pointer-events-auto"
            aria-label="Adjust bottom boundary"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              beginResizeSelection("end");
            }}
          />
          <div className="pw-selection-label pointer-events-none">
            Rows {range.start}–{range.end}
          </div>
        </>
      ) : null}
    </div>
  );
}
