"use client";

import { getSelectionClientBounds } from "@/lib/workspace-interaction/gridSelectionBounds";
import { selectionConflictsWithMappings } from "@/lib/workspace-interaction/mappingOverlap";
import { computeAssignMenuPlacement } from "@/lib/workspace-interaction/menuPlacement";
import { normalizeRange } from "@/lib/workspace-interaction/rowRangeSelection";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";

type Props = {
  containerRef: React.RefObject<HTMLElement | null>;
};

export function SelectionActionBar({ containerRef }: Props) {
  const selectedRange = useProjectWorkspaceStore((s) => s.selectedRange);
  const isSelecting = useProjectWorkspaceStore((s) => s.isSelecting);
  const assignMenu = useProjectWorkspaceStore((s) => s.assignMenu);
  const activeMappingId = useProjectWorkspaceStore((s) => s.activeMappingId);
  const activeSheetName = useProjectWorkspaceStore((s) => s.activeSheetName);
  const selectionNotice = useProjectWorkspaceStore((s) => s.selectionNotice);
  const mappings = useProjectWorkspaceStore((s) => s.mappings);
  const openAssignMenu = useProjectWorkspaceStore((s) => s.openAssignMenuForSelection);
  const confirmMappingRange = useProjectWorkspaceStore((s) => s.confirmMappingRange);
  const clearSelection = useProjectWorkspaceStore((s) => s.clearSelection);

  const show =
    selectedRange != null && !isSelecting && assignMenu == null;

  if (!show || !selectedRange) return null;

  const range = normalizeRange(selectedRange.start, selectedRange.end);
  const rowCount = range.end - range.start + 1;
  const editingMapping = activeMappingId
    ? mappings.find((m) => m.id === activeMappingId)
    : null;

  const hasOverlap = selectionConflictsWithMappings(
    range,
    mappings,
    activeSheetName,
    activeMappingId
  );

  function handleAssign() {
    if (hasOverlap) return;
    const bounds = getSelectionClientBounds(containerRef.current, selectedRange);
    if (bounds) {
      const pos = computeAssignMenuPlacement(bounds);
      openAssignMenu({ x: pos.left, y: pos.top });
      return;
    }
    openAssignMenu({ x: window.innerWidth / 2 - 120, y: 120 });
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-4">
      {selectionNotice ? (
        <p className="pointer-events-none rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          {selectionNotice}
        </p>
      ) : null}
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-lg shadow-slate-900/10 backdrop-blur-sm">
        <span className="text-xs font-medium text-slate-600">
          {editingMapping ? (
            <>
              <span className="font-semibold text-slate-800">{editingMapping.policy_line}</span>
              <span className="text-slate-400"> · </span>
            </>
          ) : null}
          <span className="text-slate-400">Rows </span>
          {range.start}–{range.end}
          <span className="text-slate-400"> ({rowCount})</span>
        </span>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
        {editingMapping ? (
          <>
            <button
              type="button"
              onClick={confirmMappingRange}
              disabled={hasOverlap}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={hasOverlap}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Change policy
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleAssign}
            disabled={hasOverlap}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Assign policy line
          </button>
        )}
        <button
          type="button"
          onClick={clearSelection}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
