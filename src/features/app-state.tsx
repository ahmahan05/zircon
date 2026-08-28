import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLookups } from "@/services/lookups";
import { DEFAULT_SETTINGS, type Lookups, type AppSettings } from "@/lib/types";
import { t, type Dictionary } from "@/lib/i18n";
import { applyAppearance, applyTheme } from "@/lib/theme";
import { applyWallpaper } from "@/lib/wallpaper";
import { journalKeys } from "@/lib/query";

interface AppState {
  lookups: Lookups | undefined;
  settings: AppSettings;
  copy: Dictionary;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const lookupsQuery = useQuery({
    queryKey: journalKeys.lookups,
    queryFn: () => getLookups(),
    staleTime: 60_000,
  });

  const settings = lookupsQuery.data?.settings ?? DEFAULT_SETTINGS;

  useEffect(() => {
    applyAppearance(settings);
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings]);

  useEffect(() => {
    return () => applyWallpaper("none");
  }, []);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: journalKeys.lookups });
  }, [queryClient]);

  const value = useMemo<AppState>(
    () => ({
      lookups: lookupsQuery.data,
      settings,
      copy: t(settings.language),
      loading: lookupsQuery.isLoading,
      refresh,
    }),
    [lookupsQuery.data, lookupsQuery.isLoading, settings, refresh],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
