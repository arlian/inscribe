const DB_NAME = "inscribe-fonts";
const DB_VERSION = 1;
const STORE_NAME = "fonts";

export interface CachedFont {
  key: string;
  bytes: ArrayBuffer;
  format: "woff2" | "woff";
  cachedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}

export function fontCacheKey(familyId: string, weight: number): string {
  return `${familyId}:${weight}`;
}

export async function getCachedFont(key: string): Promise<CachedFont | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as CachedFont | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function putCachedFont(entry: CachedFont): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function listCachedKeys(): Promise<string[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAllKeys();
    req.onsuccess = () => resolve((req.result as string[]) ?? []);
    req.onerror = () => resolve([]);
  });
}

export async function clearCachedFonts(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** Sums cached byte sizes. Falls back to this when navigator.storage.estimate() is unavailable. */
export async function cachedFontsByteSize(): Promise<number> {
  const db = await openDb();
  if (!db) return 0;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const rows = (req.result as CachedFont[]) ?? [];
      resolve(rows.reduce((sum, row) => sum + row.bytes.byteLength, 0));
    };
    req.onerror = () => resolve(0);
  });
}

export { isIndexedDbAvailable };
