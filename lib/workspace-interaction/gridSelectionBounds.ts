import type { GridApi } from "ag-grid-community";
import type { RowSelectionRange } from "@/types/project-workspace";
import { normalizeRange } from "./rowRangeSelection";
import type { SelectionBounds } from "./menuPlacement";

function findRowElement(container: HTMLElement, rowId: number): Element | null {
  return (
    container.querySelector(`.ag-row[row-id="${rowId}"]`) ??
    container.querySelector(`.ag-row[row-id='${rowId}']`)
  );
}

/** Client bounds of a row range for menu placement (viewport coordinates). */
export function getSelectionClientBounds(
  container: HTMLElement | null,
  range: RowSelectionRange | null
): SelectionBounds | null {
  if (!container || !range) return null;

  const { start, end } = normalizeRange(range.start, range.end);
  const startEl = findRowElement(container, start);
  const endEl = findRowElement(container, end);
  if (!startEl || !endEl) return null;

  const sRect = startEl.getBoundingClientRect();
  const eRect = endEl.getBoundingClientRect();

  return {
    top: sRect.top,
    left: sRect.left,
    width: Math.max(sRect.width, eRect.width),
    height: eRect.bottom - sRect.top,
    bottom: eRect.bottom,
    right: Math.max(sRect.right, eRect.right),
  };
}

/** In-container overlay geometry (synced on scroll). */
export function getSelectionOverlayStyle(
  container: HTMLElement | null,
  range: RowSelectionRange | null
): { top: number; height: number } | null {
  if (!container || !range) return null;

  const { start, end } = normalizeRange(range.start, range.end);
  const startEl = findRowElement(container, start);
  const endEl = findRowElement(container, end);
  if (!startEl || !endEl) return null;

  const wrapRect = container.getBoundingClientRect();
  const sRect = startEl.getBoundingClientRect();
  const eRect = endEl.getBoundingClientRect();

  return {
    top: sRect.top - wrapRect.top,
    height: eRect.bottom - sRect.top,
  };
}

/** Fixed-position overlay bounds (works with scroll + visible rows). */
export function getSelectionOverlayFromApi(
  api: GridApi,
  range: RowSelectionRange,
  container: HTMLElement
): { top: number; left: number; width: number; height: number } | null {
  const { start, end } = normalizeRange(range.start, range.end);
  const startNode = api.getRowNode(String(start));
  const endNode = api.getRowNode(String(end));
  if (!startNode || startNode.rowTop == null || !endNode || endNode.rowTop == null) {
    return null;
  }

  const viewport = container.querySelector(".ag-body-viewport");
  const vpRect = viewport?.getBoundingClientRect();
  const centerCols = container.querySelector(".ag-center-cols-container");
  const ccRect = centerCols?.getBoundingClientRect();
  if (!vpRect) return null;

  const rowHeight = startNode.rowHeight ?? 32;
  const top = vpRect.top + startNode.rowTop - (viewport?.scrollTop ?? 0);
  const height = endNode.rowTop + rowHeight - startNode.rowTop;
  const left = ccRect?.left ?? vpRect.left;
  const width = ccRect?.width ?? vpRect.width;

  return { top, left, width, height };
}
