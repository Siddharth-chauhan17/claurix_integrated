import type { RowSelectionRange } from "@/types/project-workspace";

/** Reusable row-range selection modes for workspace surfaces (RFQ, quotes, clauses). */
export type SelectionMode = "free" | "fixed-start" | "fixed-end";

export function normalizeRange(start: number, end: number): RowSelectionRange {
  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function rowInRange(rowIndex: number, range: RowSelectionRange): boolean {
  const n = normalizeRange(range.start, range.end);
  return rowIndex >= n.start && rowIndex <= n.end;
}

export type BeginSelectionState = {
  anchor: number;
  range: RowSelectionRange;
  mode: SelectionMode;
};

/** Spreadsheet-style edge resize when dragging from an existing selection. */
export function computeBeginSelection(
  rowIndex: number,
  existing: RowSelectionRange | null
): BeginSelectionState {
  let anchor = rowIndex;
  let rangeStart = rowIndex;
  let rangeEnd = rowIndex;
  let mode: SelectionMode = "free";

  if (existing) {
    const range = normalizeRange(existing.start, existing.end);
    const inRange = rowIndex >= range.start && rowIndex <= range.end;

    if (inRange && range.end !== range.start) {
      if (rowIndex === range.end) {
        anchor = range.start;
        rangeStart = range.start;
        rangeEnd = range.end;
        mode = "fixed-start";
      } else if (rowIndex === range.start) {
        anchor = range.end;
        rangeStart = range.start;
        rangeEnd = range.end;
        mode = "fixed-end";
      }
    }
  }

  return {
    anchor,
    range: { start: rangeStart, end: rangeEnd },
    mode,
  };
}

export function computeExtendedRange(
  rowIndex: number,
  anchor: number,
  mode: SelectionMode
): RowSelectionRange {
  if (mode === "fixed-start") {
    return { start: anchor, end: Math.max(anchor, rowIndex) };
  }
  if (mode === "fixed-end") {
    return { start: Math.min(anchor, rowIndex), end: anchor };
  }
  return normalizeRange(anchor, rowIndex);
}

export type MappingRowRole = "single" | "start" | "middle" | "end";

export function mappingRoleForRow(
  rowIndex: number,
  start: number,
  end: number
): MappingRowRole {
  const s = Math.min(start, end);
  const e = Math.max(start, end);
  if (s === e) return "single";
  if (rowIndex === s) return "start";
  if (rowIndex === e) return "end";
  return "middle";
}
