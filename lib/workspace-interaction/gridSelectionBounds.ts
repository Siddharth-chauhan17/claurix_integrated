import type { GridApi } from "ag-grid-community";
import type { RowSelectionRange } from "@/types/project-workspace";
import { normalizeRange } from "./rowRangeSelection";
import type { SelectionBounds } from "./menuPlacement";

/** Must match `RfqSpreadsheetGrid` row index column width. */
export const ROW_INDEX_COL_WIDTH = 56;

export type SelectionOverlayLayout = {
  /** Clipped overlay band (visible body viewport only). */
  top: number;
  left: number;
  width: number;
  height: number;
  /** Viewport X coordinate — center of the row index column (resize handles). */
  handleCenterX: number;
  /** Unclipped selection edges for resize handles. */
  selectionTop: number;
  selectionBottom: number;
  showTopHandle: boolean;
  showBottomHandle: boolean;
};

function findRowElement(container: HTMLElement, rowId: number): Element | null {
  return (
    container.querySelector(`.ag-row[row-id="${rowId}"]`) ??
    container.querySelector(`.ag-row[row-id='${rowId}']`)
  );
}

function findRowIndexCell(container: HTMLElement, rowIndex: number): Element | null {
  const rowEl = findRowElement(container, rowIndex);
  if (!rowEl) return null;
  return rowEl.querySelector(".ag-cell.pw-row-index-col");
}

/** Center of the pinned row-number column in viewport coordinates. */
function getRowIndexColumnCenterX(
  container: HTMLElement,
  rowIndex: number
): number | null {
  const indexCell = findRowIndexCell(container, rowIndex);
  if (indexCell) {
    const rect = indexCell.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  const pinnedLeft = container.querySelector(".ag-pinned-left-cols-container");
  if (pinnedLeft) {
    const rect = pinnedLeft.getBoundingClientRect();
    return rect.left + ROW_INDEX_COL_WIDTH / 2;
  }

  return null;
}

/** Visible data-column band (after pinned Row + Policy), in viewport coordinates. */
function getVisibleDataColumnBounds(
  container: HTMLElement
): { left: number; width: number } | null {
  const bodyViewport = container.querySelector(".ag-body-viewport");
  if (!bodyViewport) return null;

  const vpRect = bodyViewport.getBoundingClientRect();
  const pinnedLeft = container.querySelector(".ag-pinned-left-cols-container");
  const pinRect = pinnedLeft?.getBoundingClientRect();
  const left = pinRect ? pinRect.right : vpRect.left;
  const width = vpRect.right - left;
  if (width <= 0) return null;

  return { left, width };
}

function getBodyViewportRect(container: HTMLElement): DOMRect | null {
  const viewport = container.querySelector(".ag-body-viewport");
  return viewport?.getBoundingClientRect() ?? null;
}

function getVerticalBoundsFromRows(
  container: HTMLElement,
  range: RowSelectionRange
): { selectionTop: number; selectionBottom: number } | null {
  const { start, end } = normalizeRange(range.start, range.end);
  const startEl = findRowElement(container, start);
  const endEl = findRowElement(container, end);
  if (!startEl || !endEl) return null;

  const sRect = startEl.getBoundingClientRect();
  const eRect = endEl.getBoundingClientRect();
  return {
    selectionTop: sRect.top,
    selectionBottom: eRect.bottom,
  };
}

function getVerticalBoundsFromApi(
  api: GridApi,
  range: RowSelectionRange,
  container: HTMLElement
): { selectionTop: number; selectionBottom: number } | null {
  const { start, end } = normalizeRange(range.start, range.end);
  const startNode = api.getRowNode(String(start));
  const endNode = api.getRowNode(String(end));
  if (!startNode || startNode.rowTop == null || !endNode || endNode.rowTop == null) {
    return null;
  }

  const viewport = container.querySelector(".ag-body-viewport");
  const vpRect = viewport?.getBoundingClientRect();
  if (!vpRect || !viewport) return null;

  const scrollTop = viewport.scrollTop;
  const startHeight = startNode.rowHeight ?? 32;
  const endHeight = endNode.rowHeight ?? 32;
  const selectionTop = vpRect.top + startNode.rowTop - scrollTop;
  const selectionBottom =
    vpRect.top + endNode.rowTop - scrollTop + endHeight;

  return { selectionTop, selectionBottom };
}

function clipSelectionToBodyViewport(
  vpRect: DOMRect,
  selection: { selectionTop: number; selectionBottom: number }
): {
  top: number;
  height: number;
  showTopHandle: boolean;
  showBottomHandle: boolean;
} | null {
  const clipTop = Math.max(selection.selectionTop, vpRect.top);
  const clipBottom = Math.min(selection.selectionBottom, vpRect.bottom);
  if (clipBottom <= clipTop) return null;

  return {
    top: clipTop,
    height: clipBottom - clipTop,
    showTopHandle: selection.selectionTop >= vpRect.top,
    showBottomHandle: selection.selectionBottom <= vpRect.bottom,
  };
}

/**
 * Fixed-position overlay for the selected row band.
 * Handles are anchored to the row index column, not the overlay center.
 */
export function getSelectionOverlayLayout(
  container: HTMLElement,
  range: RowSelectionRange,
  api: GridApi | null
): SelectionOverlayLayout | null {
  const { start } = normalizeRange(range.start, range.end);

  const vpRect = getBodyViewportRect(container);
  const selection =
    getVerticalBoundsFromRows(container, range) ??
    (api ? getVerticalBoundsFromApi(api, range, container) : null);
  const horizontal = getVisibleDataColumnBounds(container);
  const handleCenterX = getRowIndexColumnCenterX(container, start);

  if (!vpRect || !selection || !horizontal || handleCenterX == null) return null;

  const clipped = clipSelectionToBodyViewport(vpRect, selection);
  if (!clipped) return null;

  return {
    top: clipped.top,
    left: horizontal.left,
    width: horizontal.width,
    height: clipped.height,
    handleCenterX,
    selectionTop: selection.selectionTop,
    selectionBottom: selection.selectionBottom,
    showTopHandle: clipped.showTopHandle,
    showBottomHandle: clipped.showBottomHandle,
  };
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

/** @deprecated Prefer getSelectionOverlayLayout */
export function getSelectionOverlayFromApi(
  api: GridApi,
  range: RowSelectionRange,
  container: HTMLElement
): { top: number; left: number; width: number; height: number } | null {
  const layout = getSelectionOverlayLayout(container, range, api);
  if (!layout) return null;
  return {
    top: layout.top,
    left: layout.left,
    width: layout.width,
    height: layout.height,
  };
}
