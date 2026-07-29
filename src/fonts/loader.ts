import type { FontManifestEntry } from "../app/types";
import { fontCacheKey, getCachedFont, putCachedFont } from "./cache";

export interface FontLoadResult {
  ok: boolean;
  family: string;
  error?: string;
}

const registered = new Set<string>();
const inFlight = new Map<string, Promise<FontLoadResult>>();

export function isFontRegistered(entry: FontManifestEntry): boolean {
  return registered.has(fontCacheKey(entry.id, entry.weight));
}

/** Checks IndexedDB only, no network activity. */
export async function isFontCachedOnDisk(entry: FontManifestEntry): Promise<boolean> {
  const cached = await getCachedFont(fontCacheKey(entry.id, entry.weight));
  return cached != null;
}

async function registerFace(entry: FontManifestEntry, bytes: ArrayBuffer): Promise<FontLoadResult> {
  try {
    const face = new FontFace(entry.family, bytes, { weight: String(entry.weight) });
    const loaded = await face.load();
    document.fonts.add(loaded);
    registered.add(fontCacheKey(entry.id, entry.weight));
    return { ok: true, family: entry.family };
  } catch {
    return { ok: false, family: entry.family, error: "This font could not be rendered by the browser." };
  }
}

/**
 * Registers a font that is already present in IndexedDB, without touching the network.
 * Used for lazy activation as font picker rows scroll into view. No-ops if not cached.
 */
export async function activateIfCached(entry: FontManifestEntry): Promise<FontLoadResult | null> {
  const key = fontCacheKey(entry.id, entry.weight);
  if (registered.has(key)) return { ok: true, family: entry.family };
  const cached = await getCachedFont(key);
  if (!cached) return null;
  return registerFace(entry, cached.bytes);
}

/**
 * Fetches (if needed) and registers a font family. This is the only path that hits the
 * network for a font that isn't already cached, and only runs when the user selects a font.
 */
export function ensureFontLoaded(entry: FontManifestEntry): Promise<FontLoadResult> {
  const key = fontCacheKey(entry.id, entry.weight);
  if (registered.has(key)) return Promise.resolve({ ok: true, family: entry.family });

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<FontLoadResult> => {
    const cached = await getCachedFont(key);
    if (cached) {
      return registerFace(entry, cached.bytes);
    }

    let bytes: ArrayBuffer;
    let format: "woff2" | "woff" = "woff2";
    try {
      const res = await fetch(entry.woff2);
      if (!res.ok) throw new Error(String(res.status));
      bytes = await res.arrayBuffer();
    } catch {
      try {
        const res = await fetch(entry.woff);
        if (!res.ok) throw new Error(String(res.status));
        bytes = await res.arrayBuffer();
        format = "woff";
      } catch {
        return { ok: false, family: entry.family, error: "Could not download this font. Check your connection." };
      }
    }

    await putCachedFont({ key, bytes, format, cachedAt: Date.now() });
    return registerFace(entry, bytes);
  })();

  inFlight.set(key, promise);
  promise.finally(() => inFlight.delete(key));
  return promise;
}
