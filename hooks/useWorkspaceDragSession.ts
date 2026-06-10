"use client";

import type { GridApi } from "ag-grid-community";
import { useEffect, useRef } from "react";
import { applyEdgeAutoScroll } from "@/lib/workspace-interaction/autoScroll";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

const ROW_INDEX_COL_ID = "pw-row-index";

function getGridViewport(container: HTMLElement | null): HTMLElement | null {
  return container?.querySelector(".ag-body-viewport") as HTMLElement | null;
}

function rowIndexFromTarget(api: GridApi, target: EventTarget | null): number | null {
  if (!target || !(target instanceof HTMLElement)) return null;
  const rowEl = target.closest(".ag-row");
  if (!rowEl) return null;
  const rowId = rowEl.getAttribute("row-id");
  if (!rowId) return null;
  const node = api.getRowNode(rowId);
  const idx = node?.data?._rowIndex;
  return typeof idx === "number" ? idx : null;
}

function rowIndexAtPointer(api: GridApi, clientX: number, clientY: number): number | null {
  const el = document.elementFromPoint(clientX, clientY);
  return rowIndexFromTarget(api, el);
}

type UseWorkspaceDragSessionOptions = {
  gridContainerRef: React.RefObject<HTMLElement | null>;
  gridApiRef: React.RefObject<GridApi | null>;
  enabled: boolean;
};

/**
 * Global pointer session for row-header drag + edge resize + autoscroll.
 * Ends with finishRowSelection (no assign menu).
 */
export function useWorkspaceDragSession({
  gridContainerRef,
  gridApiRef,
  enabled,
}: UseWorkspaceDragSessionOptions) {
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const extendRowSelection = useProjectWorkspaceStore.getState().extendRowSelection;
    const finishRowSelection = useProjectWorkspaceStore.getState().finishRowSelection;

    function tick() {
      const { isSelecting } = useProjectWorkspaceStore.getState();
      if (!isSelecting) {
        rafRef.current = null;
        return;
      }

      const api = gridApiRef.current;
      const viewport = getGridViewport(gridContainerRef.current);
      if (api && viewport) {
        applyEdgeAutoScroll(viewport, pointerRef.current.y);
        const row = rowIndexAtPointer(api, pointerRef.current.x, pointerRef.current.y);
        if (row != null) extendRowSelection(row);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    function onPointerMove(e: PointerEvent) {
      const { isSelecting } = useProjectWorkspaceStore.getState();
      if (!isSelecting) return;

      pointerRef.current = { x: e.clientX, y: e.clientY };

      const api = gridApiRef.current;
      if (api) {
        const row = rowIndexFromTarget(api, e.target);
        if (row != null) extendRowSelection(row);
      }

      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    function onPointerUp() {
      const { isSelecting } = useProjectWorkspaceStore.getState();
      if (!isSelecting) return;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      finishRowSelection();
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [enabled, gridApiRef, gridContainerRef]);
}

export { ROW_INDEX_COL_ID, rowIndexFromTarget };
