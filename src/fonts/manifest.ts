import manifestData from "../data/font-manifest.json";
import type { FontManifest, FontManifestEntry } from "../app/types";

const manifest = manifestData as FontManifest;

export const FONTS: FontManifestEntry[] = manifest.fonts;

export function getFontEntry(id: string): FontManifestEntry | null {
  if (!id) return null;
  return FONTS.find((f) => f.id === id) ?? null;
}
