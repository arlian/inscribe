import type { Theme } from "../app/types";
import { loadThemePreference, saveThemePreference } from "../app/storage";

function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  saveThemePreference(theme);
}

export function initTheme(): Theme {
  const stored = loadThemePreference();
  const theme = stored ?? currentTheme();
  applyTheme(theme);
  return theme;
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function getTheme(): Theme {
  return currentTheme();
}
