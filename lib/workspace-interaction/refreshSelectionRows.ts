import type { GridApi } from "ag-grid-community";
import type { RowSelectionRange } from "@/types/project-workspace";
import { normalizeRange } from "./rowRangeSelection";

function collectRowIndices(range: RowSelectionRange | null): number[] {
  if (!range) return [];
  const { start, end } = normalizeRange(range.start, range.end);
  const rows: number[] = [];
  for (let i = start; i <= end; i++) rows.push(i);
  return rows;
}

/** Re-apply getRowClass for rows that entered or left the selection range. */
export function refreshSelectionRowStyles(
  api: GridApi | null | undefined,
  previous: RowSelectionRange | null,
  current: RowSelectionRange | null
): void {
  if (!api) return;

  const affected = new Set<number>();
  for (const row of collectRowIndices(previous)) affected.add(row);
  for (const row of collectRowIndices(current)) affected.add(row);

  if (affected.size === 0) return;

  const rowNodes = Array.from(affected)
    .map((id) => api.getRowNode(String(id)))
    .filter((node) => node != null);

  if (rowNodes.length > 0) {
    api.redrawRows({ rowNodes });
  }
}
