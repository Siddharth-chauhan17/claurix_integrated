import type { PolicyMapping, RowSelectionRange } from "@/types/project-workspace";
import { normalizeRange } from "./rowRangeSelection";

/** True if two closed row ranges share at least one row. */
export function rangesOverlap(
  a: RowSelectionRange,
  b: RowSelectionRange
): boolean {
  const r1 = normalizeRange(a.start, a.end);
  const r2 = normalizeRange(b.start, b.end);
  return r1.start <= r2.end && r1.end >= r2.start;
}

export function rangeOverlapsMapping(
  range: RowSelectionRange,
  mapping: PolicyMapping
): boolean {
  return rangesOverlap(range, {
    start: mapping.start_row,
    end: mapping.end_row,
  });
}

/** Whether a selection conflicts with other mappings on the active sheet. */
export function selectionConflictsWithMappings(
  range: RowSelectionRange,
  mappings: PolicyMapping[],
  sheetName: string | null,
  ignoreMappingId?: string | null
): boolean {
  if (!sheetName) return false;

  return mappings.some(
    (m) =>
      m.sheet_name === sheetName &&
      m.id !== ignoreMappingId &&
      rangeOverlapsMapping(range, m)
  );
}

export function rowInsideMapping(
  rowIndex: number,
  mappings: PolicyMapping[],
  sheetName: string | null,
  ignoreMappingId?: string | null
): PolicyMapping | undefined {
  if (!sheetName) return undefined;
  return mappings.find(
    (m) =>
      m.sheet_name === sheetName &&
      m.id !== ignoreMappingId &&
      rowIndex >= m.start_row &&
      rowIndex <= m.end_row
  );
}
