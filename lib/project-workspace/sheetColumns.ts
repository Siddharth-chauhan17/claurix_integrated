import type { ParsedSheet, SheetColumnMeta } from "@/types/project-workspace";

const HEADER_KEYWORDS = [
  "clause",
  "requirement",
  "description",
  "particular",
  "cover",
  "section",
  "serial",
  "sr.",
  "sr no",
  "sr.no",
  "limit",
  "sum insured",
  "remarks",
  "details",
];

const PIN_KEYWORDS = [
  "clause",
  "requirement",
  "description",
  "particular",
  "cover",
  "section",
  "serial",
  "sr",
  "limit",
  "sum insured",
];

export function columnIndexToLetters(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function formatCellText(cell: unknown): string {
  if (cell == null) return "";
  return String(cell).trim();
}

export function scoreHeaderRow(cells: unknown[]): number {
  let score = 0;
  const nonEmpty = cells.filter((c) => formatCellText(c)).length;
  score += nonEmpty * 2;
  for (const cell of cells) {
    const lower = formatCellText(cell).toLowerCase();
    if (!lower) continue;
    if (HEADER_KEYWORDS.some((kw) => lower.includes(kw))) score += 12;
  }
  return score;
}

export function detectHeaderRowIndex(matrix: unknown[][]): number | null {
  const scanLimit = Math.min(40, matrix.length);
  let bestIndex = -1;
  let bestScore = 0;

  for (let i = 0; i < scanLimit; i += 1) {
    const score = scoreHeaderRow(matrix[i] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || bestScore < 8) return null;
  return bestIndex + 1;
}

export function labelFromHeaderCell(cell: unknown, letter: string): string {
  const label = formatCellText(cell);
  return label || `Column ${letter}`;
}

export function shouldPinColumn(label: string): boolean {
  const lower = label.toLowerCase();
  return PIN_KEYWORDS.some((kw) => lower.includes(kw));
}

export function columnNonEmptyRatio(matrix: unknown[][], colIndex: number): number {
  if (matrix.length === 0) return 0;
  let nonEmpty = 0;
  for (const row of matrix) {
    if (formatCellText(row[colIndex])) nonEmpty += 1;
  }
  return nonEmpty / matrix.length;
}

export function resolveColumnMeta(sheet: ParsedSheet): SheetColumnMeta[] {
  if (sheet.columnMeta?.length) return sheet.columnMeta;
  return sheet.columns.map((field, index) => ({
    field,
    letter: columnIndexToLetters(index),
    label: field.startsWith("_c") ? `Column ${columnIndexToLetters(index)}` : field,
    pinned: false,
  }));
}

export function findColumnMetaByLetter(
  sheet: ParsedSheet,
  letter: string
): SheetColumnMeta | undefined {
  const normalized = letter.trim().toUpperCase();
  return resolveColumnMeta(sheet).find((col) => col.letter === normalized);
}

export function findClauseColumns(sheet: ParsedSheet): {
  clause?: SheetColumnMeta;
  requirement?: SheetColumnMeta;
} {
  const cols = resolveColumnMeta(sheet);
  const clause =
    cols.find((c) => /clause|particular|description|cover/i.test(c.label)) ??
    cols.find((c) => c.pinned) ??
    cols[1] ??
    cols[0];
  const requirement =
    cols.find((c) => /requirement|limit|sum insured|details/i.test(c.label)) ??
    cols.find((c) => c.field !== clause?.field && c.pinned) ??
    cols[2];
  return { clause, requirement };
}
