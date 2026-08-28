import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  DEFAULT_SETTINGS,
  THEMES,
  WALLPAPERS,
  type AppSettings,
  type CurrencyCode,
  type DateFormat,
  type Language,
  type Lookups,
  type Theme,
  type Wallpaper,
} from "@/lib/types";
import { parseWallpaperOpacity } from "@/lib/wallpaper";
import { mapColor, mapDoctor, mapWorkType, type ColorRow, type DoctorRow, type WorkTypeRow } from "./db-map";
import { userDb } from "./scope";
import type { Sql } from "@/lib/db";

const defaultSettings: AppSettings = DEFAULT_SETTINGS;

export async function loadSettings(sql: Sql, userId: string): Promise<AppSettings> {
  const rows = await sql.query<{ key: string; value: string }>(
    "select key, value from app_settings where user_id = $1",
    [userId],
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    language: (map.language as Language) || defaultSettings.language,
    currency: (map.currency as CurrencyCode) || defaultSettings.currency,
    dateFormat: (map.dateFormat as DateFormat) || defaultSettings.dateFormat,
    theme: THEMES.includes(map.theme as Theme) ? (map.theme as Theme) : defaultSettings.theme,
    wallpaper: WALLPAPERS.includes(map.wallpaper as Wallpaper)
      ? (map.wallpaper as Wallpaper)
      : defaultSettings.wallpaper,
    wallpaperOpacity: parseWallpaperOpacity(map.wallpaperOpacity),
  };
}

export async function loadLookups(sql: Sql, userId: string): Promise<Lookups> {
  const [doctors, workTypes, colors, settings] = await Promise.all([
    sql.query<DoctorRow>("select * from doctors where user_id = $1 order by name", [userId]),
    sql.query<WorkTypeRow>(
      "select * from work_types where user_id = $1 order by sort_order, name",
      [userId],
    ),
    sql.query<ColorRow>(
      "select * from colors where user_id = $1 order by sort_order, name",
      [userId],
    ),
    loadSettings(sql, userId),
  ]);
  return {
    doctors: doctors.map(mapDoctor),
    workTypes: workTypes.map(mapWorkType),
    colors: colors.map(mapColor),
    settings,
  };
}

export const getLookups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await userDb(context.userId);
    return loadLookups(sql, context.userId);
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await userDb(context.userId);
    return loadSettings(sql, context.userId);
  });
