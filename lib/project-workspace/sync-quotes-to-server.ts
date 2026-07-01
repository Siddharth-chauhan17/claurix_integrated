import { listProjectDocuments, uploadProjectQuotes, type ProjectDocument } from "@/lib/api";
import type { QuoteFileRef } from "@/types/project-workspace";

export type QuoteUploadTarget = {
  quoteFileId: string;
  fileName: string;
  file: Blob;
};

function asUploadFile(blob: Blob, fileName: string): File {
  if (blob instanceof File && blob.name === fileName) {
    return blob;
  }
  const type =
    blob.type ||
    (fileName.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return new File([blob], fileName, { type });
}

function documentsByFilename(items: ProjectDocument[]): Map<string, ProjectDocument> {
  const map = new Map<string, ProjectDocument>();
  for (const doc of items) {
    const key = doc.original_filename.toLowerCase();
    const existing = map.get(key);
    if (!existing || doc.created_at > existing.created_at) {
      map.set(key, doc);
    }
  }
  return map;
}

/**
 * Upload quote files one at a time and link server document IDs by filename.
 * Per-file upload avoids flaky multi-file multipart requests.
 */
export async function syncQuotesToServer(
  projectId: string,
  targets: QuoteUploadTarget[],
  linkDocument: (quoteFileId: string, documentId: string) => void
): Promise<{ linked: number; errors: string[] }> {
  const errors: string[] = [];
  let linked = 0;

  for (const target of targets) {
    try {
      const file = asUploadFile(target.file, target.fileName);
      const { items } = await uploadProjectQuotes(projectId, [file]);
      const doc =
        items.find(
          (item) => item.original_filename.toLowerCase() === target.fileName.toLowerCase()
        ) ?? items[0];
      if (!doc?.id) {
        errors.push(`${target.fileName}: server returned no document id`);
        continue;
      }
      linkDocument(target.quoteFileId, doc.id);
      linked += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "upload failed";
      errors.push(`${target.fileName}: ${message}`);
    }
  }

  return { linked, errors };
}

/** Match already-uploaded server documents to local quote refs by filename. */
export async function reconcileQuotesFromServer(
  projectId: string,
  quoteFiles: QuoteFileRef[],
  linkDocument: (quoteFileId: string, documentId: string) => void
): Promise<number> {
  const missing = quoteFiles.filter((q) => !q.serverDocumentId);
  if (missing.length === 0) return 0;

  const { items } = await listProjectDocuments(projectId, "quote");
  if (items.length === 0) return 0;

  const byName = documentsByFilename(items);
  let linked = 0;
  for (const ref of missing) {
    const doc = byName.get(ref.name.toLowerCase());
    if (doc) {
      linkDocument(ref.id, doc.id);
      linked += 1;
    }
  }
  return linked;
}

export async function ensureQuotesOnServer(
  projectId: string,
  getQuoteFiles: () => QuoteFileRef[],
  getQuoteFileBlobs: () => Record<string, Blob>,
  linkDocument: (quoteFileId: string, documentId: string) => void
): Promise<string | null> {
  await reconcileQuotesFromServer(projectId, getQuoteFiles(), linkDocument);

  let stillMissing = getQuoteFiles().filter((q) => !q.serverDocumentId);
  if (stillMissing.length === 0) return null;

  const quoteFileBlobs = getQuoteFileBlobs();
  const targets: QuoteUploadTarget[] = [];
  const withoutBlob: string[] = [];

  for (const ref of stillMissing) {
    const blob = quoteFileBlobs[ref.id];
    if (!blob) {
      withoutBlob.push(ref.name);
      continue;
    }
    targets.push({
      quoteFileId: ref.id,
      fileName: ref.name,
      file: blob,
    });
  }

  if (targets.length > 0) {
    const { errors } = await syncQuotesToServer(projectId, targets, linkDocument);
    if (errors.length > 0) {
      stillMissing = getQuoteFiles().filter((q) => !q.serverDocumentId);
      if (stillMissing.length === 0) return null;
      return errors.join("; ");
    }
  }

  const remaining = getQuoteFiles().filter((q) => !q.serverDocumentId);
  if (remaining.length === 0) return null;

  if (withoutBlob.length > 0) {
    return (
      `${remaining.length} quote file(s) are not on the server ` +
      `(${remaining.map((q) => q.name).join(", ")}). ` +
      `Re-upload ${withoutBlob.join(", ")} in this session so AI generation can read them.`
    );
  }

  return (
    `${remaining.length} quote file(s) could not be uploaded to the server ` +
    `(${remaining.map((q) => q.name).join(", ")}). ` +
    "Check that the API is running (docker compose up) and you are signed in, then try again."
  );
}
