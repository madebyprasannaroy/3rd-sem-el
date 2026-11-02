// Client-side persistent storage helper for scans and heavy packaging photos.
// Resolves browser localStorage 5MB QuotaExceededError by offloading photos to IndexedDB
// and automatically pruning stale scan records.

const DB_NAME = "labellens_db";
const DB_VERSION = 1;
const PHOTO_STORE = "scan_photos";

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          db.createObjectStore(PHOTO_STORE, { keyPath: "scanId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Store photos in IndexedDB (virtually unlimited quota compared to 5MB localStorage) */
export async function savePhotosToIndexedDB(
  scanId: string,
  photos: { panel: string; dataUrl: string }[]
): Promise<void> {
  if (!photos || photos.length === 0) return;
  try {
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(PHOTO_STORE, "readwrite");
      const store = tx.objectStore(PHOTO_STORE);
      store.put({ scanId, photos, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (e) {
    console.warn("IndexedDB photo save note:", e);
  }
}

/** Retrieve photos from IndexedDB */
export async function getPhotosFromIndexedDB(
  scanId: string
): Promise<{ panel: string; dataUrl: string }[] | null> {
  try {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(PHOTO_STORE, "readonly");
      const store = tx.objectStore(PHOTO_STORE);
      const req = store.get(scanId);
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.photos)) {
          resolve(req.result.photos);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Prunes old scans from localStorage to prevent QuotaExceededError */
export function pruneLocalStorage(currentScanId?: string): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("labellens_scan_") && k !== `labellens_scan_${currentScanId}`) {
        keys.push(k);
      }
    }
    // Keep at most 3 historical scan records in localStorage
    if (keys.length > 3) {
      for (const k of keys.slice(0, keys.length - 3)) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn("Storage prune note:", e);
  }
}

/** Safely stores scan metadata in localStorage without throwing QuotaExceededError */
export async function safeSaveScan(
  scanId: string,
  scanData: any,
  photos?: { panel: string; dataUrl: string }[]
): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Offload heavy base64 photos to IndexedDB
  if (photos && photos.length > 0) {
    await savePhotosToIndexedDB(scanId, photos);
  }

  // 2. Prepare lightweight JSON metadata (strip large dataUrls to save 5MB quota)
  const lightweightData = {
    ...scanData,
    photos: (photos || []).map((p) => ({
      panel: p.panel,
      dataUrl: p.dataUrl.length > 50000 ? "" : p.dataUrl, // Keep only if already small thumbnail
    })),
  };

  // 3. Write to localStorage safely
  try {
    pruneLocalStorage(scanId);
    localStorage.setItem(`labellens_scan_${scanId}`, JSON.stringify(lightweightData));
  } catch (quotaError) {
    console.warn("localStorage quota exceeded. Purging older scans and retrying with minimal payload...");
    try {
      // Purge all old scans
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("labellens_scan_") && k !== `labellens_scan_${scanId}`) {
          localStorage.removeItem(k);
        }
      }
      // Save stripped metadata (no photos at all)
      const minimalData = { ...lightweightData, photos: [] };
      localStorage.setItem(`labellens_scan_${scanId}`, JSON.stringify(minimalData));
    } catch {
      // If still fails, log note but DO NOT crash the user experience
      console.warn("Unable to write to localStorage. Data is securely persisted in Supabase.");
    }
  }

  // 4. Update scan list safely (capped at 10 items)
  try {
    const rawList = localStorage.getItem("labellens_scan_list") || "[]";
    const scanList = JSON.parse(rawList);
    const filtered = scanList.filter((item: any) => item.id !== scanId);
    filtered.unshift({
      id: scanId,
      title: scanData.title,
      status: scanData.status || "needs_review",
      createdAt: scanData.createdAt || new Date().toISOString(),
      panelCount: photos ? photos.length : 1,
    });
    localStorage.setItem("labellens_scan_list", JSON.stringify(filtered.slice(0, 10)));
  } catch (listErr) {
    console.warn("Could not update labellens_scan_list in localStorage:", listErr);
  }
}

