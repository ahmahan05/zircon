import type { Theme } from "./types.ts";

const DARK_THEMES = new Set<Theme>(["dark", "graphite", "midnight"]);

export function resolveTheme(theme: Theme, prefersDark: boolean): Exclude<Theme, "system"> {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(theme, prefersDark);
  root.dataset.theme = resolved;
  root.classList.toggle("dark", DARK_THEMES.has(resolved));
}
