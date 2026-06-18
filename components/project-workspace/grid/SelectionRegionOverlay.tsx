"use client";

import type { GridApi } from "ag-grid-community";
import { useCallback, useEffect, useState } from "react";
import {
  getSelectionOverlayLayout,
  type SelectionOverlayLayout,
} from "@/lib/workspace-interaction/gridSelectionBounds";
import { normalizeRange } from "@/lib/workspace-interaction/rowRangeSelection";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

type Props = {
  containerRef: React.RefObject<HTMLElement | null>;
  gridApiRef: React.RefObject<GridApi | null>;
};

export function SelectionRegionOverlay({ containerRef, gridApiRef }: Props) {
  const selectedRange = useProjectWorkspaceStore((s) => s.selectedRange);
  const isSelecting = useProjectWorkspaceStore((s) => s.isSelecting);
  const assignMenu = useProjectWorkspaceStore((s) => s.assignMenu);
  const beginResizeSelection = useProjectWorkspaceStore((s) => s.beginResizeSelection);

  const [layout, setLayout] = useState<SelectionOverlayLayout | null>(null);

  const paint = useCallback(() => {
    const range = useProjectWorkspaceStore.getState().selectedRange;
    const container = containerRef.current;
    const api = gridApiRef.current;
    if (!range || !container) {
      setLayout(null);
      return;
    }

    setLayout(getSelectionOverlayLayout(container, range, api));
  }, [containerRef, gridApiRef]);

  useEffect(() => {
    if (!selectedRange) {
      setLayout(null);
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
    const viewports = container?.querySelectorAll(".ag-body-viewport");
    viewports?.forEach((vp) => {
      vp.addEventListener("scroll", paint, { passive: true });
    });
    window.addEventListener("resize", paint);

    return () => {
      cancelAnimationFrame(raf);
      viewports?.forEach((vp) => {
        vp.removeEventListener("scroll", paint);
      });
      window.removeEventListener("resize", paint);
    };
  }, [selectedRange, isSelecting, paint, containerRef]);

  if (!selectedRange || !layout) return null;

  const range = normalizeRange(selectedRange.start, selectedRange.end);
  const showHandles = !isSelecting && !assignMenu;

  return (
    <>
      <div
        className="pw-selection-region pointer-events-none"
        style={{
          position: "fixed",
          top: layout.top,
          left: layout.left,
          width: layout.width,
          height: layout.height,
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
          <div className="pw-selection-label pointer-events-none">
            Rows {range.start}–{range.end}
          </div>
        ) : null}
      </div>
      {showHandles && layout.showTopHandle ? (
          <button
            type="button"
            className="pw-selection-handle pw-selection-handle--fixed pointer-events-auto"
            style={{
              top: layout.selectionTop - 5,
              left: layout.handleCenterX,
            }}
            aria-label="Adjust top boundary"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              beginResizeSelection("start");
            }}
          />
        ) : null}
        {showHandles && layout.showBottomHandle ? (
          <button
            type="button"
            className="pw-selection-handle pw-selection-handle--fixed pointer-events-auto"
            style={{
              top: layout.selectionBottom - 5,
              left: layout.handleCenterX,
            }}
            aria-label="Adjust bottom boundary"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              beginResizeSelection("end");
            }}
          />
        ) : null}
    </>
  );
}
