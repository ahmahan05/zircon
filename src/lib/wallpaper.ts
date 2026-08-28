import { DEFAULT_SETTINGS, WALLPAPERS, type Wallpaper } from "./types.ts";

export const WALLPAPER_FILES: Record<Exclude<Wallpaper, "none">, string> = {
  alpine: "/wallpapers/alpine.jpg",
  fjord: "/wallpapers/fjord.jpg",
  coast: "/wallpapers/coast.jpg",
  forest: "/wallpapers/forest.jpg",
  dunes: "/wallpapers/dunes.jpg",
  night: "/wallpapers/night.jpg",
  autumn: "/wallpapers/autumn.jpg",
  tuscany: "/wallpapers/tuscany.jpg",
  glacier: "/wallpapers/glacier.jpg",
  lavender: "/wallpapers/lavender.jpg",
  waterfall: "/wallpapers/waterfall.jpg",
  tropics: "/wallpapers/tropics.jpg",
};

export function isWallpaper(value: string | undefined | null): value is Wallpaper {
  return Boolean(value && (WALLPAPERS as readonly string[]).includes(value));
}

export function clampWallpaperOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.wallpaperOpacity;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function parseWallpaperOpacity(raw: string | undefined | null): number {
  return clampWallpaperOpacity(Number.parseInt(raw ?? "", 10));
}

export function wallpaperSrc(wallpaper: Wallpaper): string | null {
  if (wallpaper === "none") return null;
  return WALLPAPER_FILES[wallpaper];
}

export function applyWallpaper(wallpaper: Wallpaper, opacity = DEFAULT_SETTINGS.wallpaperOpacity) {
  const root = document.documentElement;
  const src = wallpaperSrc(wallpaper);
  if (!src) {
    delete root.dataset.wallpaper;
    root.style.removeProperty("--app-wallpaper");
    root.style.removeProperty("--wallpaper-veil-pct");
    return;
  }
  const veil = 100 - clampWallpaperOpacity(opacity);
  root.dataset.wallpaper = wallpaper;
  root.style.setProperty("--app-wallpaper", `url("${src}")`);
  root.style.setProperty("--wallpaper-veil-pct", `${veil}%`);
}
