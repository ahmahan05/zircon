import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { useAppState } from "@/features/app-state";
import { formatDate, money } from "@/lib/format";
import type { OrderListItem, Paged } from "@/lib/types";

export function OrderTable({
  data,
  onOpen,
  onCreate,
  onPage,
}: {
  data: Paged<OrderListItem> | undefined;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onPage?: (page: number) => void;
}) {
  const { copy, settings } = useAppState();
  if (!data) return null;
  if (data.total === 0) {
    return (
      <Card className="rounded-2xl">
        <EmptyState
          title={copy.summary.emptyTitle}
          body={copy.summary.emptyBody}
          action={onCreate}
          actionLabel={`+ ${copy.summary.newOrder}`}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-border)] md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">{copy.summary.colNumber}</th>
              <th className="px-4 py-3">{copy.summary.colDoctor}</th>
              <th className="px-4 py-3">{copy.summary.colPatient}</th>
              <th className="px-4 py-3">{copy.summary.colWorks}</th>
              <th className="px-4 py-3">{copy.summary.colColor}</th>
              <th className="px-4 py-3">{copy.summary.colDate}</th>
              <th className="px-4 py-3 text-right">{copy.summary.colTotal}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/60"
                onClick={() => onOpen(row.id)}
              >
                <td className="px-4 py-3 font-medium tabular-nums">{row.orderNumber}</td>
                <td className="px-4 py-3">{row.doctorName}</td>
                <td className="px-4 py-3">{row.patientName}</td>
                <td className="max-w-48 truncate px-4 py-3 text-muted-foreground">
                  {row.itemsSummary}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.colorName ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {formatDate(row.createdAt, settings.dateFormat)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {money(row.total, settings.currency, settings.language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {data.items.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpen(row.id)}
            className="w-full rounded-2xl bg-card p-4 text-left shadow-[var(--shadow-border)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">№{row.orderNumber}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {row.doctorName} · {row.patientName}
                </div>
              </div>
              <span className="font-medium tabular-nums">
                {money(row.total, settings.currency, settings.language)}
              </span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{row.itemsSummary}</div>
            <div className="mt-3 text-sm text-muted-foreground">
              {row.colorName ?? "—"} · {formatDate(row.createdAt, settings.dateFormat)}
            </div>
          </button>
        ))}
      </div>

      {data.total > data.pageSize && onPage ? (
        <Pager
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPage={onPage}
        />
      ) : null}
    </div>
  );
}

function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { copy } = useAppState();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
      <span>
        {copy.common.page} {page} {copy.common.of} {pages}
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="prev"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="next"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
