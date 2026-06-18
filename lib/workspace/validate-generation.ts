import type { PolicyMapping, QuoteFileRef, RfqWorkbook } from "@/types/project-workspace";

/**
 * Preflight checks before POST /generate-qcr.
 * Returns a user-facing error message, or null if OK.
 */
export function validateWorkstationForQcrGeneration(
  rfqWorkbook: RfqWorkbook | null,
  quoteFiles: QuoteFileRef[],
  mappings: PolicyMapping[]
): string | null {
  if (!rfqWorkbook) {
    return "Upload an RFQ workbook before generating QCR.";
  }
  if (quoteFiles.length === 0) {
    return "Upload at least one insurer quote before generating QCR.";
  }
  if (mappings.length === 0) {
    return "Assign at least one policy section with row mappings before generating QCR.";
  }

  const rfqSheets = new Set(rfqWorkbook.sheets.map((s) => s.name));
  const staleSheetMappings = mappings.filter((m) => !rfqSheets.has(m.sheet_name));
  if (staleSheetMappings.length > 0) {
    const staleSheets = [...new Set(staleSheetMappings.map((m) => m.sheet_name))];
    const available = [...rfqSheets].join(", ");
    return (
      `Some mappings reference sheet tabs that are not in your current RFQ file: ${staleSheets.join(", ")}. ` +
      `Your RFQ has: ${available}. Re-map row ranges on the correct tabs, or re-upload the RFQ to clear stale mappings.`
    );
  }

  const quotesWithoutServer = quoteFiles.filter((q) => !q.serverDocumentId);
  if (quotesWithoutServer.length > 0) {
    return (
      `${quotesWithoutServer.length} quote file(s) were not uploaded to the server ` +
      `(${quotesWithoutServer.map((q) => q.name).join(", ")}). ` +
      "Re-upload quotes in this session so AI generation can read them."
    );
  }

  return null;
}
