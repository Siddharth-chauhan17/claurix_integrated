import type { SourceTrace } from "@/types/workspace";

/** Human-readable source trace for audit / right panel (not UI layout). */
export function formatSourceTrace(trace: SourceTrace): string {
  const parts: string[] = [trace.document_id];
  if (trace.sheet_name) parts.push(`sheet: ${trace.sheet_name}`);
  if (trace.row_start != null && trace.row_end != null) {
    parts.push(`rows ${trace.row_start}–${trace.row_end}`);
  }
  if (trace.page_start != null) {
    const end = trace.page_end ?? trace.page_start;
    parts.push(`pages ${trace.page_start}–${end}`);
  }
  return parts.join(" · ");
}
