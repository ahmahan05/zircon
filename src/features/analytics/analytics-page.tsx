import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { EmptyState } from "@/components/layout/empty-state";
import { useAppState } from "@/features/app-state";
import { getAnalytics } from "@/services/analytics";
import { analyticsPeriodRange } from "@/lib/period";
import { formatCount, formatPercent, money } from "@/lib/format";
import { minorToMajor } from "@/lib/money";
import type { AnalyticsPeriodKey, DoctorSort } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AnalyticsPage() {
  const { copy, settings, lookups } = useAppState();
  const [period, setPeriod] = useState<AnalyticsPeriodKey>("current_year");
  const [sort, setSort] = useState<DoctorSort>("revenue");
  const [doctorId, setDoctorId] = useState("");
  const [workTypeId, setWorkTypeId] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(
    () =>
      analyticsPeriodRange(period, new Date(), { from: customFrom, to: customTo }, settings.language),
    [period, customFrom, customTo, settings.language],
  );

  const query = useQuery({
    queryKey: ["analytics", range, sort, doctorId, workTypeId],
    queryFn: () =>
      getAnalytics({
        data: {
          from: range.from,
          to: range.to,
          previousFrom: range.previousFrom,
          previousTo: range.previousTo,
          currentLabel: range.label,
          previousLabel: range.previousLabel,
          doctorId: doctorId || undefined,
          workTypeId: workTypeId || undefined,
          doctorSort: sort,
        },
      }),
  });

  const data = query.data;
  const maxUnits = Math.max(1, ...(data?.workTypes.map((w) => w.units) ?? [1]));

  return (
    <div className="space-y-6">
      <PageHeader title={copy.analytics.title} subtitle={copy.analytics.subtitle} />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <Select value={period} onValueChange={(v) => setPeriod(v as AnalyticsPeriodKey)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">{copy.analytics.currentMonth}</SelectItem>
            <SelectItem value="previous_month">{copy.analytics.previousMonth}</SelectItem>
            <SelectItem value="current_year">{copy.analytics.currentYear}</SelectItem>
            <SelectItem value="custom">{copy.analytics.custom}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={doctorId || "all"} onValueChange={(v) => setDoctorId(v === "all" ? "" : v)}>
          <SelectTrigger>
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
          value={workTypeId || "all"}
          onValueChange={(v) => setWorkTypeId(v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={copy.filters.workType} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.filters.all}</SelectItem>
            {(lookups?.workTypes ?? []).filter((w) => w.isActive).map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {period === "custom" ? (
        <div className="flex gap-2">
          <input
            type="date"
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            aria-label={copy.filters.from}
          />
          <input
            type="date"
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            aria-label={copy.filters.to}
          />
        </div>
      ) : null}

      {data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={copy.analytics.kpiOrders}
            value={formatCount(data.kpis.orders, settings.language)}
          />
          <StatCard
            label={copy.analytics.kpiWorks}
            value={formatCount(data.kpis.units, settings.language)}
          />
          <StatCard
            label={copy.analytics.kpiRevenue}
            value={money(data.kpis.revenue, settings.currency, settings.language)}
          />
          <StatCard
            label={copy.analytics.kpiAverage}
            value={money(data.kpis.averageOrder, settings.currency, settings.language)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {data?.comparison ? (
        <Card className="rounded-2xl p-5">
          <div className="text-sm font-medium">{copy.analytics.comparisonTitle}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.comparison.currentLabel} {copy.analytics.vs} {data.comparison.previousLabel}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Delta
              label={copy.summary.kpiOrders}
              current={formatCount(data.comparison.orders.current, settings.language)}
              previous={formatCount(data.comparison.orders.previous, settings.language)}
              delta={data.comparison.orders.delta}
              lang={settings.language}
            />
            <Delta
              label={copy.summary.kpiWorks}
              current={formatCount(data.comparison.units.current, settings.language)}
              previous={formatCount(data.comparison.units.previous, settings.language)}
              delta={data.comparison.units.delta}
              lang={settings.language}
            />
            <Delta
              label={copy.summary.kpiRevenue}
              current={money(data.comparison.revenue.current, settings.currency, settings.language)}
              previous={money(data.comparison.revenue.previous, settings.currency, settings.language)}
              delta={data.comparison.revenue.delta}
              lang={settings.language}
            />
          </div>
        </Card>
      ) : null}

      <Card className="rounded-2xl p-5">
        <div className="text-sm font-medium">{copy.analytics.revenueTitle}</div>
        <div className="mt-4 h-64">
          {data && data.series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => String(Math.round(minorToMajor(Number(v))))}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) =>
                    money(Number(value), settings.currency, settings.language)
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--foreground)"
                  fill="var(--foreground)"
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title={copy.analytics.empty} body="" />
          )}
        </div>
      </Card>

      <Card className="rounded-2xl p-5">
        <div className="text-sm font-medium">{copy.analytics.unitsTitle}</div>
        <div className="mt-4 h-56">
          {data && data.series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="units" fill="var(--info)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl p-5">
          <div className="text-sm font-medium">{copy.analytics.workTypesTitle}</div>
          <div className="mt-4 space-y-3">
            {(data?.workTypes ?? []).slice(0, 8).map((row, i) => (
              <div key={row.workTypeId} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    {i + 1}. {row.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {row.units} · {money(row.revenue, settings.currency, settings.language)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${(row.units / maxUnits) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {data && data.workTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.analytics.empty}</p>
            ) : null}
          </div>
        </Card>

        <Card className="rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">{copy.analytics.doctorsTitle}</div>
            <Select value={sort} onValueChange={(v) => setSort(v as DoctorSort)}>
              <SelectTrigger className="h-8 w-auto min-w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orders">{copy.analytics.sortOrders}</SelectItem>
                <SelectItem value="units">{copy.analytics.sortUnits}</SelectItem>
                <SelectItem value="revenue">{copy.analytics.sortRevenue}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 space-y-3">
            {(data?.doctors ?? []).slice(0, 8).map((row, i) => (
              <div key={row.doctorId} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5">
                <div className="w-6 text-sm font-semibold tabular-nums text-muted-foreground">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.orders} · {row.units} {copy.analytics.units}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums">
                  {money(row.revenue, settings.currency, settings.language)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Delta({
  label,
  current,
  previous,
  delta,
  lang,
}: {
  label: string;
  current: string;
  previous: string;
  delta: number;
  lang: "ru" | "en";
}) {
  const up = delta >= 0;
  return (
    <div className="rounded-xl bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{current}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">{previous}</span>
        <span className={cn("tabular-nums", up ? "text-success" : "text-destructive")}>
          {formatPercent(delta, lang)}
        </span>
      </div>
    </div>
  );
}
