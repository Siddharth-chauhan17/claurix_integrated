const DB_NAME = "claurix-qcr-exports";
const DB_VERSION = 1;
const STORE_NAME = "exports";

export type StoredQcrExport = {
  projectId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  exportedAt: string;
};

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
    };
  });
}

export async function saveQcrExportBlob(
  projectId: string,
  blob: Blob,
  fileName: string
): Promise<StoredQcrExport> {
  const db = await openDb();
  const exportedAt = new Date().toISOString();
  try {
    const record: StoredQcrExport = {
      projectId,
      fileName,
      mimeType:
        blob.type ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      blob,
      exportedAt,
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onerror = () => reject(req.error ?? new Error("Failed to save QCR export"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("QCR export transaction failed"));
    });
    return record;
  } finally {
    db.close();
  }
}

export async function loadQcrExportBlob(
  projectId: string
): Promise<StoredQcrExport | null> {
  const db = await openDb();
  try {
    return await new Promise<StoredQcrExport | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(projectId);
      req.onerror = () => reject(req.error ?? new Error("Failed to load QCR export"));
      req.onsuccess = () => {
        const result = req.result as StoredQcrExport | undefined;
        resolve(result ?? null);
      };
    });
  } finally {
    db.close();
  }
}

export async function deleteQcrExportBlob(projectId: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(projectId);
      req.onerror = () => reject(req.error ?? new Error("Failed to delete QCR export"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("QCR export delete failed"));
    });
  } finally {
    db.close();
  }
}
