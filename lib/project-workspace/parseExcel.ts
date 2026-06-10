import * as XLSX from "xlsx";
import type { ParsedSheet, SheetRow } from "@/types/project-workspace";

export async function parseExcelFile(file: File): Promise<ParsedSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  return workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      worksheet,
      { header: 1, defval: "", raw: false }
    );

    if (matrix.length === 0) {
      return { name, columns: ["A"], rows: [] };
    }

    const headerRow = matrix[0] ?? [];
    const columns = headerRow.map((cell, i) => {
      const label = String(cell ?? "").trim();
      return label || `Column ${i + 1}`;
    });

    const rows: SheetRow[] = matrix.slice(1).map((row, idx) => {
      const record: SheetRow = { _rowIndex: idx + 1 };
      columns.forEach((col, colIdx) => {
        record[col] = row[colIdx] ?? "";
      });
      return record;
    });

    return { name, columns, rows };
  });
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
