import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/features/app-state";
import { saveSettings } from "@/services/settings";
import { cn } from "@/lib/utils";
import { applyTheme } from "@/lib/theme";
import { THEMES, WALLPAPERS, type AppSettings, type Theme, type Wallpaper } from "@/lib/types";
import { applyWallpaper, clampWallpaperOpacity, wallpaperSrc } from "@/lib/wallpaper";
import type { Dictionary } from "@/lib/i18n";
import { patchLookupsSettings } from "@/lib/query";

type SettingsPatch = Partial<
  Pick<AppSettings, "language" | "currency" | "dateFormat" | "theme" | "wallpaper" | "wallpaperOpacity">
>;

export function AppearanceCard() {
  const { copy, settings } = useAppState();
  const queryClient = useQueryClient();
  const [opacity, setOpacity] = useState(settings.wallpaperOpacity);
  const opacityTimer = useRef<number | null>(null);

  useEffect(() => {
    setOpacity(settings.wallpaperOpacity);
  }, [settings.wallpaperOpacity]);

  useEffect(() => {
    return () => {
      if (opacityTimer.current) window.clearTimeout(opacityTimer.current);
    };
  }, []);

  const settingsMut = useMutation({
    mutationFn: (patch: SettingsPatch) => saveSettings({ data: patch }),
    onSuccess: async (saved, patch) => {
      patchLookupsSettings(queryClient, saved);
      if (!(Object.keys(patch).length === 1 && patch.wallpaperOpacity != null)) {
        toast(copy.settings.saved);
      }
    },
  });

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{copy.settings.appearance}</h2>
      <Card className="grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
        <Field label={copy.settings.language}>
          <Select
            value={settings.language}
            onValueChange={(v) => settingsMut.mutate({ language: v as "ru" | "en" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ru">Русский</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={copy.settings.currency}>
          <Select
            value={settings.currency}
            onValueChange={(v) => settingsMut.mutate({ currency: v as "RUB" | "USD" | "EUR" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RUB">₽ RUB</SelectItem>
              <SelectItem value="USD">$ USD</SelectItem>
              <SelectItem value="EUR">€ EUR</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={copy.settings.dateFormat}>
          <Select
            value={settings.dateFormat}
            onValueChange={(v) =>
              settingsMut.mutate({ dateFormat: v as "dd.MM.yyyy" | "yyyy-MM-dd" | "MM/dd/yyyy" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd.MM.yyyy">21.08.2026</SelectItem>
              <SelectItem value="yyyy-MM-dd">2026-08-21</SelectItem>
              <SelectItem value="MM/dd/yyyy">08/21/2026</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={copy.settings.theme} className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {THEMES.map((theme) => {
              const selected = settings.theme === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => {
                    applyTheme(theme);
                    settingsMut.mutate({ theme });
                  }}
                  className={cn(
                    "rounded-xl border p-2 text-left transition-colors",
                    selected ? "border-foreground" : "border-border hover:border-foreground/40",
                  )}
                >
                  <span className={cn("mb-2 block h-8 w-full rounded-md", `theme-chip-${theme}`)} />
                  <span className="text-xs font-medium">{themeLabel(theme, copy)}</span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label={copy.settings.wallpaper} className="sm:col-span-2">
          <p className="-mt-1 mb-2 text-xs text-muted-foreground">{copy.settings.wallpaperHint}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WALLPAPERS.map((wallpaper) => {
              const selected = settings.wallpaper === wallpaper;
              const src = wallpaperSrc(wallpaper);
              return (
                <button
                  key={wallpaper}
                  type="button"
                  onClick={() => {
                    applyWallpaper(wallpaper, opacity);
                    settingsMut.mutate({ wallpaper });
                  }}
                  className={cn(
                    "overflow-hidden rounded-xl border text-left transition-colors",
                    selected ? "border-foreground" : "border-border hover:border-foreground/40",
                  )}
                >
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-full object-cover"
                    />
                  ) : (
                    <span className="block h-16 w-full bg-muted" />
                  )}
                  <span className="block px-2 py-1.5 text-xs font-medium">
                    {wallpaperLabel(wallpaper, copy)}
                  </span>
                </button>
              );
            })}
          </div>
          {settings.wallpaper !== "none" ? (
            <div className="space-y-2 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{copy.settings.wallpaperOpacity}</span>
                <span className="tabular-nums text-xs font-medium">{opacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={opacity}
                aria-label={copy.settings.wallpaperOpacity}
                className="h-2 w-full accent-foreground"
                onChange={(e) => {
                  const next = clampWallpaperOpacity(Number(e.target.value));
                  setOpacity(next);
                  applyWallpaper(settings.wallpaper, next);
                  if (opacityTimer.current) window.clearTimeout(opacityTimer.current);
                  opacityTimer.current = window.setTimeout(() => {
                    settingsMut.mutate({ wallpaperOpacity: next });
                  }, 250);
                }}
              />
            </div>
          ) : null}
        </Field>
      </Card>
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function themeLabel(theme: Theme, copy: Dictionary): string {
  const labels: Record<Theme, string> = {
    light: copy.settings.themeLight,
    ivory: copy.settings.themeIvory,
    ocean: copy.settings.themeOcean,
    dark: copy.settings.themeDark,
    graphite: copy.settings.themeGraphite,
    midnight: copy.settings.themeMidnight,
    system: copy.settings.themeSystem,
  };
  return labels[theme];
}

function wallpaperLabel(wallpaper: Wallpaper, copy: Dictionary): string {
  const labels: Record<Wallpaper, string> = {
    none: copy.settings.wallpaperNone,
    alpine: copy.settings.wallpaperAlpine,
    fjord: copy.settings.wallpaperFjord,
    coast: copy.settings.wallpaperCoast,
    forest: copy.settings.wallpaperForest,
    dunes: copy.settings.wallpaperDunes,
    night: copy.settings.wallpaperNight,
    autumn: copy.settings.wallpaperAutumn,
    tuscany: copy.settings.wallpaperTuscany,
    glacier: copy.settings.wallpaperGlacier,
    lavender: copy.settings.wallpaperLavender,
    waterfall: copy.settings.wallpaperWaterfall,
    tropics: copy.settings.wallpaperTropics,
  };
  return labels[wallpaper];
}
