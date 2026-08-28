import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/features/app-state";
import { useOrderSheet } from "@/features/orders/order-sheet";
import type { OrderFilters, PeriodKey } from "@/lib/types";
import { periodRange } from "@/lib/period";

export interface FilterState {
  period: PeriodKey;
  customFrom: string;
  customTo: string;
  doctorId: string;
  workTypeId: string;
  colorId: string;
  q: string;
  page: number;
}

export const defaultFilters: FilterState = {
  period: "month",
  customFrom: "",
  customTo: "",
  doctorId: "",
  workTypeId: "",
  colorId: "",
  q: "",
  page: 1,
};

export function toOrderFilters(state: FilterState): OrderFilters {
  const range = periodRange(state.period, new Date(), {
    from: state.customFrom,
    to: state.customTo,
  });
  return {
    from: range.from,
    to: range.to,
    doctorId: state.doctorId || undefined,
    workTypeId: state.workTypeId || undefined,
    colorId: state.colorId || undefined,
    q: state.q || undefined,
    page: state.page,
    pageSize: 20,
  };
}

export function FilterBar({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const { copy, lookups } = useAppState();
  const searchFocusToken = useOrderSheet((s) => s.searchFocusToken);
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(value.q);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (searchFocusToken > 0) searchRef.current?.focus();
  }, [searchFocusToken]);

  useEffect(() => {
    setQ(value.q);
  }, [value.q]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const current = valueRef.current;
      if (q !== current.q) onChange({ ...current, q, page: 1 });
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, onChange]);

  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch, page: 1 });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={copy.summary.searchPlaceholder}
          className="h-11 rounded-xl pl-9"
          aria-label={copy.summary.searchPlaceholder}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select value={value.period} onValueChange={(v) => set({ period: v as PeriodKey })}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder={copy.filters.period} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{copy.filters.today}</SelectItem>
            <SelectItem value="week">{copy.filters.week}</SelectItem>
            <SelectItem value="month">{copy.filters.month}</SelectItem>
            <SelectItem value="quarter">{copy.filters.quarter}</SelectItem>
            <SelectItem value="year">{copy.filters.year}</SelectItem>
            <SelectItem value="custom">{copy.filters.custom}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={value.doctorId || "all"}
          onValueChange={(v) => set({ doctorId: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder={copy.filters.doctor} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.filters.all}</SelectItem>
            {(lookups?.doctors ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.workTypeId || "all"}
          onValueChange={(v) => set({ workTypeId: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder={copy.filters.workType} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.filters.all}</SelectItem>
            {(lookups?.workTypes ?? [])
              .filter((w) => w.isActive)
              .map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select
          value={value.colorId || "all"}
          onValueChange={(v) => set({ colorId: v === "all" ? "" : v })}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder={copy.filters.color} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.filters.all}</SelectItem>
            {(lookups?.colors ?? [])
              .filter((c) => c.isActive)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      {value.period === "custom" ? (
        <div className="flex gap-2">
          <Input
            type="date"
            value={value.customFrom}
            onChange={(e) => set({ customFrom: e.target.value })}
            aria-label={copy.filters.from}
          />
          <Input
            type="date"
            value={value.customTo}
            onChange={(e) => set({ customTo: e.target.value })}
            aria-label={copy.filters.to}
          />
        </div>
      ) : null}
    </div>
  );
}
