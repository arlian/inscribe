import { store } from "../app/state";
import { getFontEntry } from "./manifest";
import { ensureFontLoaded, isFontRegistered } from "./loader";

export type FontStatus = "system" | "loading" | "ready" | "error";

let status: FontStatus = "system";
let error: string | null = null;
const listeners = new Set<() => void>();

export function onFontStatusChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function getFontStatus(): { status: FontStatus; error: string | null } {
  return { status, error };
}

/** CSS family name to hand to the render path: the loaded family, or "" for the system fallback stack. */
export function resolvedCssFamily(): string {
  const entry = getFontEntry(store.get().layer.fontFamily);
  if (!entry || status !== "ready") return "";
  return entry.family;
}

export async function selectFont(id: string): Promise<void> {
  store.setLayer({ fontFamily: id });
  await syncSelectedFont();
}

/** Ensures the currently selected font (e.g. restored from localStorage) is loaded and registered. */
export async function syncSelectedFont(): Promise<void> {
  const entry = getFontEntry(store.get().layer.fontFamily);
  if (!entry) {
    status = "system";
    error = null;
    notify();
    return;
  }
  if (isFontRegistered(entry)) {
    status = "ready";
    error = null;
    notify();
    return;
  }
  status = "loading";
  error = null;
  notify();
  const result = await ensureFontLoaded(entry);
  if (result.ok) {
    status = "ready";
    error = null;
  } else {
    status = "error";
    error = result.error ?? "This font failed to load.";
  }
  notify();
}
