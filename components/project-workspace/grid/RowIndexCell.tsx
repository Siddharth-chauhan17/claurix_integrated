"use client";

import type { ICellRendererParams } from "ag-grid-community";
import type { SheetRow } from "@/types/project-workspace";

export function RowIndexCell(params: ICellRendererParams<SheetRow>) {
  const value = params.value ?? params.data?._rowIndex ?? "";

  return (
    <div className="pw-row-index-cell" title="Drag to select rows">
      <span className="pw-row-index-cell__grip" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="pw-row-index-cell__num">{value}</span>
    </div>
  );
}
