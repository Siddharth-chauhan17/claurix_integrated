"use client";

import type { ColDef, RowClickedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { ensureAgGridModules } from "@/lib/project-workspace/agGridSetup";
import type { ComparisonMatrixRow } from "@/lib/workspace-engine";
import { cn } from "@/lib/utils";
import type { WorkspaceRendererProps } from "./types";

ensureAgGridModules();

/** Row model for AG Grid — insurer values flattened for dynamic columns. */
type GridRow = {
  clause_id: string;
  title: string;
  category: string;
  comparison_type: string;
  editable: boolean;
  risk_level: string;
  insurers: Record<string, string>;
  [insurer: string]: string | boolean | Record<string, string> | undefined;
};

/**
 * AG Grid is presentation-only: columns and rows come from buildComparisonMatrix().
 */
export function TableRenderer({
  matrix,
  config,
  callbacks,
}: WorkspaceRendererProps) {
  if (!matrix) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        No comparison data for this section.
      </div>
    );
  }

  const columnDefs = useMemo<ColDef<GridRow>[]>(() => {
    const fixed: ColDef<GridRow>[] = [
      {
        field: "title",
        headerName: "Clause",
        pinned: "left",
        minWidth: 200,
        flex: 1,
      },
      {
        field: "category",
        headerName: "Category",
        width: 120,
      },
      {
        field: "risk_level",
        headerName: "Risk",
        width: 100,
      },
    ];
    const insurerCols: ColDef<GridRow>[] = matrix.insurer_columns.map(
      (insurer) => ({
        field: insurer,
        headerName: insurer,
        minWidth: 140,
        flex: 1,
        valueGetter: (p) => p.data?.insurers?.[insurer] ?? "—",
      })
    );
    return [...fixed, ...insurerCols];
  }, [matrix.insurer_columns]);

  const rowData = useMemo<GridRow[]>(() => {
    return matrix.rows.map((row) => {
      const flat: GridRow = { ...row, ...row.insurers };
      return flat;
    });
  }, [matrix.rows]);

  return (
    <div className={cn("ag-theme-alpine h-full w-full", config.readOnly && "")}>
      <AgGridReact<GridRow>
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{
          sortable: true,
          resizable: true,
          filter: false,
        }}
        rowSelection="single"
        suppressCellFocus={config.readOnly}
        onRowClicked={(e: RowClickedEvent<GridRow>) => {
          const id = e.data?.clause_id;
          if (id) callbacks.onSelectClause?.(id);
        }}
        getRowId={(p) => p.data.clause_id}
        animateRows={false}
        headerHeight={40}
        rowHeight={44}
      />
    </div>
  );
}
