"use client";

import type { ColDef, GridApi, GridReadyEvent, RowClassParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ensureAgGridModules } from "@/lib/project-workspace/agGridSetup";
import { PolicyRegionCell } from "@/components/project-workspace/grid/PolicyRegionCell";
import { RowIndexCell } from "@/components/project-workspace/grid/RowIndexCell";
import { SelectionActionBar } from "@/components/project-workspace/grid/SelectionActionBar";
import { SelectionRegionOverlay } from "@/components/project-workspace/grid/SelectionRegionOverlay";
import {
  ROW_INDEX_COL_ID,
  useWorkspaceDragSession,
} from "@/hooks/useWorkspaceDragSession";
import { buildMappingRowClasses, mappingForRow } from "@/lib/workspace-interaction/mappingRowClasses";
import { refreshSelectionRowStyles } from "@/lib/workspace-interaction/refreshSelectionRows";
import { rowInRange } from "@/lib/workspace-interaction/rowRangeSelection";
import type { RowSelectionRange } from "@/types/project-workspace";
import { cn } from "@/lib/utils";
import { useProjectWorkspaceStore } from "@/stores/projectWorkspaceStore";
import type { PolicyMapping, SheetRow } from "@/types/project-workspace";

ensureAgGridModules();

export function RfqSpreadsheetGrid() {
  const activeSheetName = useProjectWorkspaceStore((s) => s.activeSheetName);
  const rfqWorkbook = useProjectWorkspaceStore((s) => s.rfqWorkbook);
  const mappings = useProjectWorkspaceStore((s) => s.mappings);
  const selectedRange = useProjectWorkspaceStore((s) => s.selectedRange);
  const isSelecting = useProjectWorkspaceStore((s) => s.isSelecting);
  const assignMenu = useProjectWorkspaceStore((s) => s.assignMenu);
  const hoveredMappingId = useProjectWorkspaceStore((s) => s.hoveredMappingId);
  const activeMappingId = useProjectWorkspaceStore((s) => s.activeMappingId);
  const beginRowSelection = useProjectWorkspaceStore((s) => s.beginRowSelection);
  const openMappingEditor = useProjectWorkspaceStore((s) => s.openMappingEditor);
  const setHoveredMapping = useProjectWorkspaceStore((s) => s.setHoveredMapping);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const prevSelectionRef = useRef<RowSelectionRange | null>(null);
  const [gridReady, setGridReady] = useState(false);

  useEffect(() => {
    if (!gridReady) return;
    refreshSelectionRowStyles(
      gridApiRef.current,
      prevSelectionRef.current,
      selectedRange
    );
    prevSelectionRef.current = selectedRange
      ? { start: selectedRange.start, end: selectedRange.end }
      : null;
  }, [selectedRange, isSelecting, gridReady]);

  useWorkspaceDragSession({
    gridContainerRef: gridWrapRef,
    gridApiRef,
    enabled: gridReady,
  });

  const sheet = useMemo(() => {
    if (!rfqWorkbook || !activeSheetName) return null;
    return rfqWorkbook.sheets.find((s) => s.name === activeSheetName) ?? null;
  }, [rfqWorkbook, activeSheetName]);

  const sheetMappings = useMemo(
    () => mappings.filter((m) => m.sheet_name === activeSheetName),
    [mappings, activeSheetName]
  );

  const gridContext = useMemo(
    () => ({ sheetMappings }),
    [sheetMappings]
  );

  const columnDefs = useMemo<ColDef<SheetRow>[]>(() => {
    if (!sheet) return [];
    const cols: ColDef<SheetRow>[] = [
      {
        colId: ROW_INDEX_COL_ID,
        field: "_rowIndex",
        headerName: "#",
        width: 64,
        pinned: "left",
        suppressMovable: true,
        sortable: false,
        cellRenderer: RowIndexCell,
        cellClass: "pw-row-index-col",
        suppressHeaderMenuButton: true,
      },
      {
        colId: "pw-policy",
        headerName: "Policy",
        width: 148,
        pinned: "left",
        suppressMovable: true,
        sortable: false,
        cellRenderer: PolicyRegionCell,
        cellClass: "pw-policy-col",
        suppressHeaderMenuButton: true,
      },
    ];
    sheet.columns.forEach((col) => {
      cols.push({
        field: col,
        headerName: col,
        minWidth: 120,
        flex: 1,
        cellClass: "pw-data-col",
      });
    });
    return cols;
  }, [sheet]);

  const getRowClass = useCallback(
    (params: RowClassParams<SheetRow>) => {
      const rowIndex = params.data?._rowIndex;
      if (rowIndex == null) return "";

      const classes: string[] = [];
      const mappingClasses = buildMappingRowClasses({
        rowIndex,
        sheetMappings,
        hoveredMappingId,
        activeMappingId,
      });
      if (mappingClasses) classes.push(mappingClasses);

      if (selectedRange && rowInRange(rowIndex, selectedRange)) {
        classes.push(isSelecting ? "pw-row-selecting-live" : "pw-row-selected-pending");
      }

      return classes.join(" ");
    },
    [sheetMappings, hoveredMappingId, activeMappingId, selectedRange, isSelecting]
  );

  const getRowStyle = useCallback(
    (params: RowClassParams<SheetRow>) => {
      const rowIndex = params.data?._rowIndex;
      if (rowIndex == null) return undefined;
      const mapping = mappingForRow(rowIndex, sheetMappings);
      if (!mapping) return undefined;
      return {
        "--pw-map-color": mapping.color,
      } as Record<string, string>;
    },
    [sheetMappings]
  );

  const onGridReady = useCallback((e: GridReadyEvent<SheetRow>) => {
    gridApiRef.current = e.api;
    setGridReady(true);
  }, []);

  const onRowIndexPointerDown = useCallback(
    (rowIndex: number, event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const mapping = sheetMappings.find(
        (m) => rowIndex >= m.start_row && rowIndex <= m.end_row
      );

      if (mapping && !event.shiftKey) {
        openMappingEditor(mapping.id);
        return;
      }

      beginRowSelection(rowIndex);
    },
    [beginRowSelection, openMappingEditor, sheetMappings]
  );

  const onCellPointerDown = useCallback(
    (colId: string | undefined, rowIndex: number | null, event: PointerEvent) => {
      if (rowIndex == null || colId !== ROW_INDEX_COL_ID) return;
      onRowIndexPointerDown(rowIndex, event);
    },
    [onRowIndexPointerDown]
  );

  const onCellMouseOver = useCallback(
    (rowIndex: number | null) => {
      if (rowIndex == null || isSelecting) return;
      const mapping = mappingForRow(rowIndex, sheetMappings);
      setHoveredMapping(mapping?.id ?? null);
    },
    [isSelecting, sheetMappings, setHoveredMapping]
  );

  if (!sheet) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Upload an RFQ Excel file to begin policy mapping.
      </div>
    );
  }

  return (
    <div
      ref={gridWrapRef}
      className={cn(
        "pw-grid-wrap relative h-full w-full min-h-[420px]",
        isSelecting && "pw-grid-wrap--selecting"
      )}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={cn("ag-theme-alpine h-full w-full pw-grid")}>
        <AgGridReact<SheetRow>
          rowData={sheet.rows}
          columnDefs={columnDefs}
          context={gridContext}
          defaultColDef={{
            resizable: true,
            sortable: false,
            filter: false,
          }}
          getRowId={(p) => String(p.data._rowIndex)}
          getRowClass={getRowClass}
          getRowStyle={getRowStyle}
          rowHeight={32}
          headerHeight={36}
          suppressRowClickSelection
          suppressCellFocus
          enableCellTextSelection
          onGridReady={onGridReady}
          onCellMouseDown={(e) => {
            if (!e.event) return;
            const ev = e.event as PointerEvent;
            onCellPointerDown(e.column?.getColId(), e.data?._rowIndex ?? null, ev);
          }}
          onCellMouseOver={(e) => {
            onCellMouseOver(e.data?._rowIndex ?? null);
          }}
          onCellMouseOut={() => {
            if (!isSelecting) setHoveredMapping(null);
          }}
          onCellClicked={(e) => {
            const colId = e.column?.getColId();
            if (colId !== "pw-policy" || !e.event) return;
            const rowIndex = e.data?._rowIndex;
            if (rowIndex == null) return;
            const mapping = mappingForRow(rowIndex, sheetMappings);
            if (mapping) openMappingEditor(mapping.id);
          }}
        />
      </div>
      <SelectionRegionOverlay containerRef={gridWrapRef} gridApiRef={gridApiRef} />
      <SelectionActionBar containerRef={gridWrapRef} />
      {selectedRange && !isSelecting && !assignMenu ? (
        <p className="pointer-events-none absolute left-3 top-1 z-20 text-[10px] font-medium text-slate-500">
          {activeMappingId
            ? "Adjust rows with handles, then click Done"
            : "Drag row numbers to select, then assign policy"}
        </p>
      ) : null}
    </div>
  );
}
