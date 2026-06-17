import * as XLSX from "xlsx";
import type { ParsedSheet, SheetColumnMeta, SheetRow } from "@/types/project-workspace";
import {
  columnIndexToLetters,
  columnNonEmptyRatio,
  detectHeaderRowIndex,
  formatCellText,
  labelFromHeaderCell,
  shouldPinColumn,
} from "./sheetColumns";

const EMPTY_COLUMN_THRESHOLD = 0.02;

function maxColumnCount(matrix: unknown[][]): number {
  return matrix.reduce((max, row) => Math.max(max, row.length), 0);
}

function buildColumnMeta(
  matrix: unknown[][],
  colCount: number,
  headerRowIndex: number | null
): SheetColumnMeta[] {
  const headerRow =
    headerRowIndex != null ? matrix[headerRowIndex - 1] ?? [] : [];

  const draft = Array.from({ length: colCount }, (_, colIndex) => {
    const letter = columnIndexToLetters(colIndex);
    const label = labelFromHeaderCell(headerRow[colIndex], letter);
    const pinned = shouldPinColumn(label);
    const ratio = columnNonEmptyRatio(matrix, colIndex);
    return {
      field: `_c${colIndex}`,
      letter,
      label,
      pinned,
      ratio,
    };
  });

  return draft
    .filter((col) => col.pinned || col.ratio > EMPTY_COLUMN_THRESHOLD)
    .map(({ field, letter, label, pinned }) => ({ field, letter, label, pinned }));
}

function buildRows(
  matrix: unknown[][],
  columns: SheetColumnMeta[]
): SheetRow[] {
  return matrix.map((row, rowIdx) => {
    const record: SheetRow = { _rowIndex: rowIdx + 1 };
    for (const col of columns) {
      const colIndex = Number.parseInt(col.field.replace("_c", ""), 10);
      record[col.field] = formatCellText(row[colIndex]);
    }
    return record;
  });
}

function parseWorksheet(name: string, worksheet: XLSX.WorkSheet): ParsedSheet {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    worksheet,
    { header: 1, defval: "", raw: false }
  );

  if (matrix.length === 0) {
    return {
      name,
      columns: [],
      columnMeta: [],
      headerRowIndex: null,
      rows: [],
    };
  }

  const colCount = maxColumnCount(matrix);
  const headerRowIndex = detectHeaderRowIndex(matrix);
  const columnMeta = buildColumnMeta(matrix, colCount, headerRowIndex);
  const columns = columnMeta.map((col) => col.field);
  const rows = buildRows(matrix, columnMeta);

  return {
    name,
    columns,
    columnMeta,
    headerRowIndex,
    rows,
  };
}

export async function parseExcelFile(file: File): Promise<ParsedSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  return workbook.SheetNames.map((name) =>
    parseWorksheet(name, workbook.Sheets[name])
  );
}

export function isRfqExcel(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

export function isQuoteFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".pdf")
  );
}
