/**
 * Reads original RFQ Excel cell values for clause source verification.
 *
 * Source metadata (`sheet_name`, `clause_cell`, etc.) always refers to the **RFQ workbook**,
 * never insurer quote files. Lookup uses:
 * 1. RFQ blob in memory (Zustand)
 * 2. RFQ blob restored from IndexedDB (persists across refresh/navigation)
 * 3. Parsed `rfqWorkbook` from localStorage (fallback; less precise)
 */

import * as XLSX from "xlsx";
import { resolveRfqBlobForProject } from "@/lib/project-workspace/rfq-blob-access";
import type { RfqWorkbook } from "@/types/project-workspace";
import type { ClauseSource } from "./types";

const valueCache = new Map<string, string | null>();

export type ClauseSourceLookupInput = {
  projectId: string | null;
  source: ClauseSource;
  /** In-memory RFQ blob from projectWorkspaceStore (may be null after hydrate). */
  rfqFileBlob: Blob | null;
  /** Parsed RFQ metadata from localStorage (not used for quote files). */
  rfqWorkbook: RfqWorkbook | null;
};

function cacheKey(input: ClauseSourceLookupInput, blobTag: string): string {
  return [
    input.projectId ?? "no-project",
    blobTag,
    input.source.sheet_name,
    input.source.clause_cell,
  ].join("|");
}

/** Parse Excel A1-style reference (e.g. B88). */
export function parseCellRef(ref: string): { colLetters: string; row: number } | null {
  const match = /^([A-Za-z]+)(\d+)$/.exec(ref.trim());
  if (!match) return null;
  return {
    colLetters: match[1].toUpperCase(),
    row: Number.parseInt(match[2], 10),
  };
}

/** Convert column letters to 0-based index (A=0, B=1, Z=25, AA=26). */
export function columnLettersToIndex(letters: string): number {
  let index = 0;
  for (let i = 0; i < letters.length; i += 1) {
    index = index * 26 + (letters.charCodeAt(i) - 64);
  }
  return index - 1;
}

function formatCellValue(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (raw instanceof Date) return raw.toISOString();
  return String(raw).trim();
}

function findSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): XLSX.WorkSheet | null {
  const trimmed = sheetName.trim();
  if (workbook.Sheets[trimmed]) return workbook.Sheets[trimmed];
  const match = workbook.SheetNames.find(
    (n) => n === trimmed || n.trim() === trimmed
  );
  return match ? workbook.Sheets[match] ?? null : null;
}

function readCellFromWorksheet(
  worksheet: XLSX.WorkSheet,
  cellRef: string
): string | null {
  const ref = cellRef.trim().toUpperCase();
  const cell = worksheet[ref];
  if (!cell) return null;
  const text = cell.w ?? cell.v;
  const formatted = formatCellValue(text);
  return formatted === "" ? null : formatted;
}

async function readFromRfqBlob(
  blob: Blob,
  source: ClauseSource
): Promise<string | null> {
  const buffer = await blob.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = findSheet(workbook, source.sheet_name);
  if (!sheet) return null;
  return readCellFromWorksheet(sheet, source.clause_cell);
}

/**
 * Fallback when blob unavailable: map A1 column via parsed header row.
 * `_rowIndex` is 1-based index of data rows (Excel row 2 → _rowIndex 1).
 */
function readFromParsedRfqWorkbook(
  workbook: RfqWorkbook,
  source: ClauseSource
): string | null {
  const trimmedSheet = source.sheet_name.trim();
  const sheet = workbook.sheets.find(
    (s) => s.name === trimmedSheet || s.name.trim() === trimmedSheet
  );
  if (!sheet) return null;

  const parsed = parseCellRef(source.clause_cell);
  if (!parsed) return null;

  const colIndex = columnLettersToIndex(parsed.colLetters);
  const columnKey = sheet.columns[colIndex];
  if (!columnKey) return null;

  const dataRowIndex = source.excel_row - 1;
  const dataRow = sheet.rows.find((r) => r._rowIndex === dataRowIndex);
  if (!dataRow) return null;

  const formatted = formatCellValue(dataRow[columnKey]);
  return formatted === "" ? null : formatted;
}

/**
 * Resolve the original RFQ clause cell text (`source.clause_cell` on `source.sheet_name`).
 */
export async function lookupClauseSourceValue(
  input: ClauseSourceLookupInput
): Promise<string | null> {
  const rfqBlob = await resolveRfqBlobForProject(
    input.projectId,
    input.rfqFileBlob
  );

  const blobTag = rfqBlob
    ? `${rfqBlob.size}:${rfqBlob.type}`
    : input.rfqWorkbook?.fileName ?? "no-blob";

  const key = cacheKey(input, blobTag);
  if (valueCache.has(key)) {
    return valueCache.get(key) ?? null;
  }

  let value: string | null = null;

  if (rfqBlob) {
    try {
      value = await readFromRfqBlob(rfqBlob, input.source);
    } catch {
      value = null;
    }
  }

  if ((value == null || value === "") && input.rfqWorkbook) {
    value = readFromParsedRfqWorkbook(input.rfqWorkbook, input.source);
  }

  valueCache.set(key, value);
  return value;
}

/** Clear cache when RFQ file changes. */
export function clearClauseSourceValueCache(): void {
  valueCache.clear();
}
