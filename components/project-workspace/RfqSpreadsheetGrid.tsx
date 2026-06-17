"use client";

import type { ColDef, GridApi, GridReadyEvent, RowClassParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ensureAgGridModules } from "@/lib/project-workspace/agGridSetup";
import { resolveColumnMeta } from "@/lib/project-workspace/sheetColumns";
import { PolicyRegionCell } from "@/components/project-workspace/grid/PolicyRegionCell";
import { RowIndexCell } from "@/components/project-workspace/grid/RowIndexCell";
import { SelectionActionBar } from "@/components/project-workspace/grid/SelectionActionBar";
import { SelectionRegionOverlay } from "@/components/project-workspace/grid/SelectionRegionOverlay";
import { GridZoomToolbar } from "@/components/project-workspace/GridZoomToolbar";
import {
  clampGridZoom,
  GRID_ZOOM_MAX,
  measureGridFitZoom,
} from "@/lib/project-workspace/measureGridFitZoom";
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
import type { PolicyMapping, SheetColumnMeta, SheetRow } from "@/types/project-workspace";

ensureAgGridModules();

function columnMinWidth(meta: SheetColumnMeta): number {
  const label = meta.label.toLowerCase();
  if (label.includes("requirement") || label.includes("description")) return 240;
  if (label.includes("clause") || label.includes("particular")) return 200;
  if (meta.pinned) return 160;
  return 120;
}

function columnHeaderName(meta: SheetColumnMeta): string {
  return `${meta.letter}\n${meta.label}`;
}

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
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);

  const updateFitZoom = useCallback(() => {
    const container = gridWrapRef.current;
    if (!container) return;
    setZoom((current) => {
      const fit = measureGridFitZoom(container, current);
      setMinZoom(fit);
      return clampGridZoom(current, fit, GRID_ZOOM_MAX);
    });
  }, []);

  const handleZoomChange = useCallback(
    (next: number) => {
      setZoom(clampGridZoom(next, minZoom, GRID_ZOOM_MAX));
    },
    [minZoom]
  );

  const sheet = useMemo(() => {
    if (!rfqWorkbook || !activeSheetName) return null;
    return rfqWorkbook.sheets.find((s) => s.name === activeSheetName) ?? null;
  }, [rfqWorkbook, activeSheetName]);

  const columnMeta = useMemo(
    () => (sheet ? resolveColumnMeta(sheet) : []),
    [sheet]
  );

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

    const pinnedData = columnMeta.filter((col) => col.pinned);
    const scrollData = columnMeta.filter((col) => !col.pinned);

    const dataColDef = (meta: SheetColumnMeta, pinned: boolean): ColDef<SheetRow> => ({
      field: meta.field,
      headerName: columnHeaderName(meta),
      headerClass: "pw-col-header",
      minWidth: columnMinWidth(meta),
      width: columnMinWidth(meta),
      pinned: pinned ? "left" : undefined,
      wrapText: true,
      autoHeight: true,
      cellClass: cn("pw-data-col", pinned && "pw-data-col--pinned"),
      tooltipField: meta.field,
    });

    const cols: ColDef<SheetRow>[] = [
      {
        colId: ROW_INDEX_COL_ID,
        field: "_rowIndex",
        headerName: "Row",
        width: 56,
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
        width: 132,
        pinned: "left",
        suppressMovable: true,
        sortable: false,
        cellRenderer: PolicyRegionCell,
        cellClass: "pw-policy-col",
        suppressHeaderMenuButton: true,
      },
    ];

    pinnedData.forEach((meta) => cols.push(dataColDef(meta, true)));
    scrollData.forEach((meta) => cols.push(dataColDef(meta, false)));

    return cols;
  }, [sheet, columnMeta]);

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

  useEffect(() => {
    if (!gridReady || !gridApiRef.current) return;
    gridApiRef.current.resetRowHeights();
  }, [sheet, columnMeta, zoom, gridReady]);

  useEffect(() => {
    if (!gridReady) return;

    updateFitZoom();

    const container = gridWrapRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateFitZoom();
    });
    resizeObserver.observe(container);

    window.addEventListener("resize", updateFitZoom);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFitZoom);
    };
  }, [gridReady, sheet, columnMeta, columnDefs, updateFitZoom]);

  useWorkspaceDragSession({
    gridContainerRef: gridWrapRef,
    gridApiRef,
    enabled: gridReady,
  });

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
    e.api.resetRowHeights();
    requestAnimationFrame(() => {
      const container = gridWrapRef.current;
      if (!container) return;
      setZoom((current) => {
        const fit = measureGridFitZoom(container, current);
        setMinZoom(fit);
        return clampGridZoom(current, fit, GRID_ZOOM_MAX);
      });
    });
  }, []);

  const onColumnResized = useCallback(() => {
    requestAnimationFrame(updateFitZoom);
  }, [updateFitZoom]);

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
    <div className="flex h-full min-h-0 flex-col">
      <GridZoomToolbar
        zoom={zoom}
        minZoom={minZoom}
        onZoomChange={handleZoomChange}
        columnCount={columnMeta.length}
        rowCount={sheet.rows.length}
        headerRowIndex={sheet.headerRowIndex ?? null}
      />
      <div
        ref={gridWrapRef}
        className={cn(
          "pw-grid-wrap relative min-h-0 flex-1 w-full",
          isSelecting && "pw-grid-wrap--selecting"
        )}
        style={{ "--pw-grid-zoom": zoom } as React.CSSProperties}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className={cn("ag-theme-alpine h-full w-full pw-grid pw-grid--zoomed")}>
          <AgGridReact<SheetRow>
            rowData={sheet.rows}
            columnDefs={columnDefs}
            context={gridContext}
            defaultColDef={{
              resizable: true,
              sortable: false,
              filter: false,
              wrapText: true,
              autoHeight: true,
            }}
            getRowId={(p) => String(p.data._rowIndex)}
            getRowClass={getRowClass}
            getRowStyle={getRowStyle}
            headerHeight={48}
            suppressRowClickSelection
            suppressCellFocus
            enableCellTextSelection
            tooltipShowDelay={400}
            onGridReady={onGridReady}
            onColumnResized={onColumnResized}
            onFirstDataRendered={onColumnResized}
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
    </div>
  );
}
