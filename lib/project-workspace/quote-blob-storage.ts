/**
 * Insurer quote file blobs (IndexedDB) — survives refresh for server re-upload.
 */

const DB_NAME = "claurix-workspace";
const DB_VERSION = 3;
const STORE_NAME = "quote-files";

export type StoredQuoteFile = {
  key: string;
  projectId: string;
  quoteFileId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  savedAt: string;
};

function storageKey(projectId: string, quoteFileId: string): string {
  return `${projectId}:${quoteFileId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("rfq-files")) {
        db.createObjectStore("rfq-files", { keyPath: "projectId" });
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("archived-rfq-files")) {
        db.createObjectStore("archived-rfq-files", { keyPath: "key" });
      }
    };
  });
}

export async function saveQuoteBlob(
  projectId: string,
  quoteFileId: string,
  file: Blob,
  fileName: string
): Promise<void> {
  const db = await openDb();
  try {
    const record: StoredQuoteFile = {
      key: storageKey(projectId, quoteFileId),
      projectId,
      quoteFileId,
      fileName,
      mimeType: file.type || "application/octet-stream",
      blob: file,
      savedAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onerror = () => reject(req.error ?? new Error("Failed to save quote blob"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Quote blob transaction failed"));
    });
  } finally {
    db.close();
  }
}

export async function loadQuoteBlobsForProject(
  projectId: string
): Promise<StoredQuoteFile[]> {
  const db = await openDb();
  try {
    return await new Promise<StoredQuoteFile[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onerror = () => reject(req.error ?? new Error("Failed to load quote blobs"));
      req.onsuccess = () => {
        const all = (req.result as StoredQuoteFile[] | undefined) ?? [];
        resolve(all.filter((row) => row.projectId === projectId));
      };
    });
  } finally {
    db.close();
  }
}

export async function deleteQuoteBlob(
  projectId: string,
  quoteFileId: string
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(storageKey(projectId, quoteFileId));
      req.onerror = () => reject(req.error ?? new Error("Failed to delete quote blob"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Quote delete transaction failed"));
    });
  } finally {
    db.close();
  }
}
