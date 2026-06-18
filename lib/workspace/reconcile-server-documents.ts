import { listProjectDocuments } from "@/lib/api";
import type { QuoteFileRef, RfqWorkbook } from "@/types/project-workspace";

function newestByFilename<T extends { original_filename: string; created_at: string }>(
  items: T[]
): Map<string, T> {
  const byName = new Map<string, T>();
  for (const doc of items) {
    const key = doc.original_filename.toLowerCase();
    const existing = byName.get(key);
    if (!existing || doc.created_at > existing.created_at) {
      byName.set(key, doc);
    }
  }
  return byName;
}

/** Link local quote refs to server document IDs when uploads succeeded but IDs were not saved. */
export async function reconcileQuoteServerDocumentIds(
  projectId: string,
  quoteFiles: QuoteFileRef[],
  setQuoteServerDocumentId: (quoteFileId: string, documentId: string) => void
): Promise<void> {
  const missing = quoteFiles.filter((q) => !q.serverDocumentId);
  if (missing.length === 0) return;

  const { items } = await listProjectDocuments(projectId, "quote");
  if (items.length === 0) return;

  const byName = newestByFilename(items);
  for (const ref of missing) {
    const doc = byName.get(ref.name.toLowerCase());
    if (doc) {
      setQuoteServerDocumentId(ref.id, doc.id);
    }
  }
}

/** Link local RFQ workbook to server document ID when missing from persisted state. */
export async function reconcileRfqServerDocumentId(
  projectId: string,
  rfqWorkbook: RfqWorkbook | null,
  setRfqServerDocumentId: (documentId: string) => void
): Promise<void> {
  if (!rfqWorkbook || rfqWorkbook.serverDocumentId) return;

  const { items } = await listProjectDocuments(projectId, "rfq");
  const match = newestByFilename(items).get(rfqWorkbook.fileName.toLowerCase());
  if (match) {
    setRfqServerDocumentId(match.id);
  }
}
