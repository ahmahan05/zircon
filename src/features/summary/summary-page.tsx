import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { useAppState } from "@/features/app-state";
import { FilterBar, defaultFilters, toOrderFilters, type FilterState } from "@/features/orders/filter-bar";
import { OrderTable } from "@/features/orders/order-table";
import { useOrderSheet } from "@/features/orders/order-sheet";
import { getSummaryKpis, listOrders } from "@/services/orders";
import { formatCount, money } from "@/lib/format";
import { journalKeys } from "@/lib/query";

export function SummaryPage() {
  const { copy, settings } = useAppState();
  const openCreate = useOrderSheet((s) => s.openCreate);
  const openDetails = useOrderSheet((s) => s.openDetails);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const queryFilters = useMemo(() => toOrderFilters(filters), [filters]);

  const ordersQuery = useQuery({
    queryKey: [...journalKeys.orders, queryFilters],
    queryFn: () => listOrders({ data: queryFilters }),
    staleTime: 15_000,
  });
  const kpisQuery = useQuery({
    queryKey: [...journalKeys.kpis, queryFilters],
    queryFn: () => getSummaryKpis({ data: queryFilters }),
    staleTime: 15_000,
  });

  const kpis = kpisQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.summary.title}
        subtitle={copy.summary.subtitle}
        actions={
          <Button onClick={openCreate} className="h-11 rounded-xl px-4">
            <Plus className="size-4" />
            {copy.summary.newOrder}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis ? (
          <>
            <StatCard label={copy.summary.kpiOrders} value={formatCount(kpis.orders, settings.language)} />
            <StatCard label={copy.summary.kpiWorks} value={formatCount(kpis.units, settings.language)} />
            <StatCard
              label={copy.summary.kpiRevenue}
              value={money(kpis.revenue, settings.currency, settings.language)}
            />
            <StatCard label={copy.summary.kpiDoctors} value={formatCount(kpis.doctors, settings.language)} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        )}
      </div>

      <FilterBar value={filters} onChange={setFilters} />

      {ordersQuery.isLoading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : (
        <OrderTable
          data={ordersQuery.data}
          onOpen={openDetails}
          onCreate={openCreate}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}
    </div>
  );
}
