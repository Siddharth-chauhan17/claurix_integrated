import type { PolicyMapping } from "@/types/project-workspace";
import { mappingRoleForRow, rowInRange } from "./rowRangeSelection";

function rowInMapping(rowIndex: number, mapping: PolicyMapping): boolean {
  return rowIndex >= mapping.start_row && rowIndex <= mapping.end_row;
}

export type MappingRowClassInput = {
  rowIndex: number;
  sheetMappings: PolicyMapping[];
  hoveredMappingId: string | null;
  activeMappingId: string | null;
};

export function buildMappingRowClasses({
  rowIndex,
  sheetMappings,
  hoveredMappingId,
  activeMappingId,
}: MappingRowClassInput): string {
  const mapping = sheetMappings.find((m) => rowInMapping(rowIndex, m));
  if (!mapping) return "";

  const classes = ["pw-map-block"];
  const role = mappingRoleForRow(rowIndex, mapping.start_row, mapping.end_row);
  classes.push(`pw-map-block--${role}`);

  if (hoveredMappingId === mapping.id) classes.push("pw-map-block--hover");
  if (activeMappingId === mapping.id) classes.push("pw-map-block--active");

  return classes.join(" ");
}

export function mappingForRow(
  rowIndex: number,
  sheetMappings: PolicyMapping[]
): PolicyMapping | undefined {
  return sheetMappings.find((m) => rowInMapping(rowIndex, m));
}

export { rowInRange };
