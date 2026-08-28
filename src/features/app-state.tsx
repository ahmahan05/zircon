import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLookups } from "@/services/lookups";
import type { Lookups, AppSettings } from "@/lib/types";
import { t, type Dictionary } from "@/lib/i18n";
import { applyTheme } from "@/lib/theme";
import { journalKeys } from "@/lib/query";

export type OrderSheet =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; orderId: string }
  | { mode: "details"; orderId: string };

interface AppState {
  lookups: Lookups | undefined;
  settings: AppSettings;
  copy: Dictionary;
  loading: boolean;
  sheet: OrderSheet;
  searchFocusToken: number;
  openCreate: () => void;
  openEdit: (orderId: string) => void;
  openDetails: (orderId: string) => void;
  closeSheet: () => void;
  focusSearch: () => void;
  refresh: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  language: "ru",
  currency: "RUB",
  dateFormat: "dd.MM.yyyy",
  theme: "light",
};

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const lookupsQuery = useQuery({
    queryKey: journalKeys.lookups,
    queryFn: () => getLookups(),
  });
  const [sheet, setSheet] = useState<OrderSheet>({ mode: "closed" });
  const [searchFocusToken, setSearchFocusToken] = useState(0);

  const settings = lookupsQuery.data?.settings ?? defaultSettings;

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: journalKeys.lookups });
  }, [queryClient]);

  const value = useMemo<AppState>(
    () => ({
      lookups: lookupsQuery.data,
      settings,
      copy: t(settings.language),
      loading: lookupsQuery.isLoading,
      sheet,
      searchFocusToken,
      openCreate: () => setSheet({ mode: "create" }),
      openEdit: (orderId) => setSheet({ mode: "edit", orderId }),
      openDetails: (orderId) => setSheet({ mode: "details", orderId }),
      closeSheet: () => setSheet({ mode: "closed" }),
      focusSearch: () => setSearchFocusToken((n) => n + 1),
      refresh,
    }),
    [lookupsQuery.data, lookupsQuery.isLoading, settings, sheet, searchFocusToken, refresh],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
