/**
 * RFQ workbook file persistence (IndexedDB).
 *
 * ## RFQ lifecycle (Source verification depends on this)
 *
 * 1. **Upload** — `useWorkstationUploads` → `parseExcelFile` + `setRfqWorkbook(workbook, file)`
 * 2. **In-memory** — `projectWorkspaceStore.rfqFileBlob` (original File/Blob for exact A1 cell reads)
 * 3. **Parsed metadata** — `rfqWorkbook` saved to localStorage via `persist()` / `hydrate()`
 * 4. **Binary persistence** — this module stores the RFQ blob in IndexedDB keyed by `projectId`
 *
 * `hydrate()` restores parsed `rfqWorkbook` from localStorage but does NOT keep the blob in RAM.
 * Source lookup reloads the blob from IndexedDB so refresh / navigation / QCR workspace still work.
 *
 * Source metadata always refers to the **RFQ** workbook only — never insurer quote files.
 */

const DB_NAME = "claurix-workspace";
const DB_VERSION = 3;
const STORE_NAME = "rfq-files";
const ARCHIVED_STORE_NAME = "archived-rfq-files";

export type StoredRfqFile = {
  projectId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  savedAt: string;
};

export type StoredArchivedRfqFile = {
  key: string;
  projectId: string;
  rfqFileId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  savedAt: string;
};

function archivedStorageKey(projectId: string, rfqFileId: string): string {
  return `${projectId}:${rfqFileId}`;
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
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "projectId" });
      }
      if (!db.objectStoreNames.contains("quote-files")) {
        db.createObjectStore("quote-files", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(ARCHIVED_STORE_NAME)) {
        db.createObjectStore(ARCHIVED_STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

/** Persist the original RFQ upload for a project (survives refresh). */
export async function saveRfqBlob(
  projectId: string,
  file: Blob,
  fileName: string
): Promise<void> {
  const db = await openDb();
  try {
    const record: StoredRfqFile = {
      projectId,
      fileName,
      mimeType: file.type || "application/octet-stream",
      blob: file,
      savedAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onerror = () => reject(req.error ?? new Error("Failed to save RFQ blob"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("RFQ blob transaction failed"));
    });
  } finally {
    db.close();
  }
}

/** Load persisted RFQ blob for exact Excel cell reads (Source verification). */
export async function loadRfqBlob(projectId: string): Promise<StoredRfqFile | null> {
  const db = await openDb();
  try {
    return await new Promise<StoredRfqFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(projectId);
      req.onerror = () => reject(req.error ?? new Error("Failed to load RFQ blob"));
      req.onsuccess = () => {
        const result = req.result as StoredRfqFile | undefined;
        resolve(result ?? null);
      };
    });
  } finally {
    db.close();
  }
}

export async function deleteRfqBlob(projectId: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(projectId);
      req.onerror = () => reject(req.error ?? new Error("Failed to delete RFQ blob"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("RFQ delete transaction failed"));
    });
  } finally {
    db.close();
  }
}

export async function saveArchivedRfqBlob(
  projectId: string,
  rfqFileId: string,
  file: Blob,
  fileName: string
): Promise<void> {
  const db = await openDb();
  try {
    const record: StoredArchivedRfqFile = {
      key: archivedStorageKey(projectId, rfqFileId),
      projectId,
      rfqFileId,
      fileName,
      mimeType: file.type || "application/octet-stream",
      blob: file,
      savedAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ARCHIVED_STORE_NAME, "readwrite");
      const store = tx.objectStore(ARCHIVED_STORE_NAME);
      const req = store.put(record);
      req.onerror = () =>
        reject(req.error ?? new Error("Failed to save archived RFQ blob"));
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Archived RFQ blob transaction failed"));
    });
  } finally {
    db.close();
  }
}

export async function loadArchivedRfqBlobsForProject(
  projectId: string
): Promise<StoredArchivedRfqFile[]> {
  const db = await openDb();
  try {
    return await new Promise<StoredArchivedRfqFile[]>((resolve, reject) => {
      const tx = db.transaction(ARCHIVED_STORE_NAME, "readonly");
      const store = tx.objectStore(ARCHIVED_STORE_NAME);
      const req = store.getAll();
      req.onerror = () =>
        reject(req.error ?? new Error("Failed to load archived RFQ blobs"));
      req.onsuccess = () => {
        const all = (req.result as StoredArchivedRfqFile[] | undefined) ?? [];
        resolve(all.filter((row) => row.projectId === projectId));
      };
    });
  } finally {
    db.close();
  }
}

export async function deleteArchivedRfqBlob(
  projectId: string,
  rfqFileId: string
): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ARCHIVED_STORE_NAME, "readwrite");
      const store = tx.objectStore(ARCHIVED_STORE_NAME);
      const req = store.delete(archivedStorageKey(projectId, rfqFileId));
      req.onerror = () =>
        reject(req.error ?? new Error("Failed to delete archived RFQ blob"));
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("Archived RFQ delete transaction failed"));
    });
  } finally {
    db.close();
  }
}
