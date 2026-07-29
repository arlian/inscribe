import type { PersistedSettings, Theme } from "./types";

const SETTINGS_KEY = "inscribe:settings";
const THEME_KEY = "inscribe:theme";

function storageAvailable(): boolean {
  try {
    const probe = "__inscribe_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export const hasLocalStorage = storageAvailable();

export function loadSettings(): PersistedSettings {
  if (!hasLocalStorage) return {};
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedSettings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: PersistedSettings): void {
  if (!hasLocalStorage) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Quota exceeded or unavailable; settings simply won't persist.
  }
}

export function patchSettings(patch: Partial<PersistedSettings>): void {
  const current = loadSettings();
  saveSettings({ ...current, ...patch });
}

export function loadThemePreference(): Theme | null {
  if (!hasLocalStorage) return null;
  const value = window.localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" ? value : null;
}

export function saveThemePreference(theme: Theme): void {
  if (!hasLocalStorage) return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}
