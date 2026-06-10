"use client";

import type { CSSProperties } from "react";
import type { ICellRendererParams } from "ag-grid-community";
import { mappingRoleForRow } from "@/lib/workspace-interaction/rowRangeSelection";
import type { PolicyMapping, SheetRow } from "@/types/project-workspace";

type PolicyRegionContext = {
  sheetMappings: PolicyMapping[];
};

function rowInMapping(rowIndex: number, mapping: PolicyMapping): boolean {
  return rowIndex >= mapping.start_row && rowIndex <= mapping.end_row;
}

export function PolicyRegionCell(params: ICellRendererParams<SheetRow, unknown, PolicyRegionContext>) {
  const rowIndex = params.data?._rowIndex;
  const mappings = params.context?.sheetMappings ?? [];
  if (rowIndex == null) return null;

  const mapping = mappings.find((m) => rowInMapping(rowIndex, m));
  if (!mapping) return <span className="pw-policy-empty">—</span>;

  const role = mappingRoleForRow(rowIndex, mapping.start_row, mapping.end_row);
  if (role !== "start" && role !== "single") {
    return <span className="pw-policy-continuation" />;
  }

  return (
    <span
      className="pw-policy-badge"
      style={
        {
          "--pw-map-color": mapping.color,
        } as CSSProperties
      }
    >
      {mapping.policy_line}
    </span>
  );
}
