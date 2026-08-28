import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { useAppState } from "@/features/app-state";
import {
  archiveWorkType,
  deleteColor,
  deleteWorkType,
  saveColor,
  saveSettings,
  saveWorkType,
} from "@/services/settings";
import { DataBackup } from "@/features/settings/data-backup";
import { AccountCard } from "@/features/settings/account-card";
import { minorToMajor, parseMajorInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import { applyTheme } from "@/lib/theme";
import { THEMES, type Theme, type WorkType } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { invalidateJournal } from "@/lib/query";

export function SettingsPage() {
  const { copy, settings, lookups } = useAppState();
  const queryClient = useQueryClient();
  const [wtName, setWtName] = useState("");
  const [wtPrice, setWtPrice] = useState("");
  const [colorName, setColorName] = useState("");
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});

  const invalidate = async () => {
    await invalidateJournal(queryClient);
  };

  const settingsMut = useMutation({
    mutationFn: (patch: {
      language?: "ru" | "en";
      currency?: "RUB" | "USD" | "EUR";
      dateFormat?: "dd.MM.yyyy" | "yyyy-MM-dd" | "MM/dd/yyyy";
      theme?: Theme;
    }) => saveSettings({ data: patch }),
    onSuccess: async () => {
      toast(copy.settings.saved);
      await invalidate();
    },
  });

  const addWork = useMutation({
    mutationFn: () =>
      saveWorkType({
        data: {
          payload: {
            name: wtName.trim(),
            defaultPrice: parseMajorInput(wtPrice) ?? 0,
          },
        },
      }),
    onSuccess: async () => {
      setWtName("");
      setWtPrice("");
      toast(copy.settings.saved);
      await invalidate();
    },
    onError: (err) => toast.error(workTypeError(err, copy)),
  });

  const addColorMut = useMutation({
    mutationFn: () => saveColor({ data: { payload: { name: colorName.trim() } } }),
    onSuccess: async () => {
      setColorName("");
      toast(copy.settings.saved);
      await invalidate();
    },
  });

  const workTypes = lookups?.workTypes ?? [];
  const colors = lookups?.colors ?? [];

  async function persistWorkType(wt: WorkType, patch: { name?: string; priceRaw?: string }) {
    const name = (patch.name ?? editingName[wt.id] ?? wt.name).trim();
    const rawPrice = patch.priceRaw ?? editingPrice[wt.id];
    const price = rawPrice != null ? (parseMajorInput(rawPrice) ?? wt.defaultPrice) : wt.defaultPrice;
    if (!name) {
      setEditingName((prev) => ({ ...prev, [wt.id]: wt.name }));
      return;
    }
    if (name === wt.name && price === wt.defaultPrice) return;
    try {
      await saveWorkType({
        data: { id: wt.id, payload: { name, defaultPrice: price } },
      });
      await invalidate();
    } catch (err) {
      toast.error(workTypeError(err, copy));
      setEditingName((prev) => ({ ...prev, [wt.id]: wt.name }));
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={copy.settings.title} subtitle={copy.settings.subtitle} />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{copy.settings.workTypes}</h2>
          <p className="text-sm text-muted-foreground">{copy.settings.workTypesHint}</p>
        </div>
        <Card className="overflow-hidden rounded-2xl">
          <div className="divide-y divide-border">
            {workTypes.map((wt) => (
              <div key={wt.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-40 flex-1 space-y-1">
                  <Input
                    className="h-9"
                    value={editingName[wt.id] ?? wt.name}
                    onChange={(e) => setEditingName((p) => ({ ...p, [wt.id]: e.target.value }))}
                    onBlur={(e) => void persistWorkType(wt, { name: e.target.value })}
                    aria-label={copy.settings.name}
                  />
                  <div className="text-xs text-muted-foreground">
                    {wt.isActive ? copy.settings.active : copy.settings.archived}
                  </div>
                </div>
                <Input
                  className="h-9 w-28 tabular-nums"
                  value={editingPrice[wt.id] ?? String(minorToMajor(wt.defaultPrice))}
                  onChange={(e) => setEditingPrice((p) => ({ ...p, [wt.id]: e.target.value }))}
                  onBlur={(e) => void persistWorkType(wt, { priceRaw: e.target.value })}
                  inputMode="decimal"
                  aria-label={copy.settings.price}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await archiveWorkType({ data: { id: wt.id, isActive: !wt.isActive } });
                    await invalidate();
                  }}
                >
                  {wt.isActive ? copy.settings.archive : copy.settings.restore}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={async () => {
                    await deleteWorkType({ data: { id: wt.id } });
                    await invalidate();
                  }}
                >
                  {copy.common.delete}
                </Button>
              </div>
            ))}
          </div>
          <form
            className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (wtName.trim()) addWork.mutate();
            }}
          >
            <Input
              placeholder={copy.settings.name}
              value={wtName}
              onChange={(e) => setWtName(e.target.value)}
            />
            <Input
              placeholder={copy.settings.price}
              className="sm:w-32"
              value={wtPrice}
              onChange={(e) => setWtPrice(e.target.value)}
              inputMode="decimal"
            />
            <Button type="submit" disabled={!wtName.trim()}>
              {copy.settings.addWorkType}
            </Button>
          </form>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{copy.settings.colors}</h2>
          <p className="text-sm text-muted-foreground">{copy.settings.colorsHint}</p>
        </div>
        <Card className="rounded-2xl p-4">
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background pl-3 pr-1 py-1 text-sm"
              >
                {c.name}
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={async () => {
                    try {
                      await deleteColor({ data: { id: c.id } });
                      await invalidate();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : copy.common.errorGeneric);
                    }
                  }}
                  aria-label={`${copy.common.delete} ${c.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (colorName.trim()) addColorMut.mutate();
            }}
          >
            <Input
              placeholder={copy.settings.addColor}
              value={colorName}
              onChange={(e) => setColorName(e.target.value)}
            />
            <Button type="submit" disabled={!colorName.trim()}>
              {copy.settings.addColor}
            </Button>
          </form>
        </Card>
      </section>

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
        </Card>
      </section>

      <AccountCard />
      <DataBackup onImported={invalidate} />
    </div>
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

function workTypeError(err: unknown, copy: Dictionary): string {
  const message = err instanceof Error ? err.message : "";
  if (message.includes("WORK_TYPE_EXISTS")) return copy.settings.workTypeExists;
  return message || copy.common.errorGeneric;
}

