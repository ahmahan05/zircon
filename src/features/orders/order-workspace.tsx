import { useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppState } from "@/features/app-state";
import { OrderForm } from "./order-form";
import { deleteOrder, duplicateOrder, getOrder } from "@/services/orders";
import { formatDateTime, money } from "@/lib/format";
import { invalidateJournal, journalKeys } from "@/lib/query";

function OrderDetails({
  orderId,
  onEdit,
  onClose,
}: {
  orderId: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  const { copy, settings } = useAppState();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const orderQuery = useQuery({
    queryKey: journalKeys.order(orderId),
    queryFn: () => getOrder({ data: { id: orderId } }),
  });
  const order = orderQuery.data;

  async function afterChange() {
    await invalidateJournal(queryClient, orderId);
  }

  const dup = useMutation({
    mutationFn: () => duplicateOrder({ data: { id: orderId } }),
    onSuccess: async () => {
      toast(copy.order.duplicated);
      await afterChange();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || copy.common.errorGeneric);
    },
  });
  const del = useMutation({
    mutationFn: () => deleteOrder({ data: { id: orderId } }),
    onSuccess: async () => {
      toast(copy.order.deleted);
      onClose();
      await afterChange();
    },
    onError: (err: Error) => {
      toast.error(err.message || copy.common.errorGeneric);
      setConfirmDelete(false);
    },
  });

  if (!order) {
    return <div className="px-6 py-8 text-sm text-muted-foreground">{copy.common.loading}</div>;
  }

  const busy = dup.isPending || del.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold tracking-tight">№{order.orderNumber}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {order.doctorName} · {order.patientName}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{copy.order.color}</div>
            <div>{order.colorName ?? copy.order.noColor}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{copy.order.created}</div>
            <div>{formatDateTime(order.createdAt, settings.dateFormat)}</div>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{item.workTypeName}</div>
                <div className="text-xs text-muted-foreground">
                  {item.quantity} × {money(item.unitPrice, settings.currency, settings.language)}
                </div>
              </div>
              <div className="tabular-nums">
                {money(item.quantity * item.unitPrice, settings.currency, settings.language)}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 text-sm font-semibold">
            <span>{copy.order.total}</span>
            <span className="tabular-nums">
              {money(order.total, settings.currency, settings.language)}
            </span>
          </div>
        </div>
        {order.notes ? <p className="text-sm text-muted-foreground">{order.notes}</p> : null}
      </div>
      {confirmDelete ? (
        <div className="shrink-0 space-y-3 border-t border-border p-4">
          <p className="text-sm">{copy.order.deleteConfirm}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDelete(false)}
              disabled={del.isPending}
            >
              {copy.common.cancel}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => del.mutate()}
              disabled={del.isPending}
            >
              {del.isPending ? copy.order.deleting : copy.order.delete}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border p-4">
          <Button variant="outline" onClick={() => dup.mutate()} disabled={busy}>
            <Copy className="size-4" />
            {dup.isPending ? copy.order.duplicating : copy.order.duplicate}
          </Button>
          <Button variant="outline" onClick={onEdit} disabled={busy}>
            <Pencil className="size-4" />
            {copy.order.edit}
          </Button>
          <Button
            variant="ghost"
            className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            <Trash2 className="size-4" />
            {copy.order.delete}
          </Button>
        </div>
      )}
    </div>
  );
}

export function OrderWorkspace() {
  const { sheet, closeSheet, openEdit, copy } = useAppState();
  const open = sheet.mode !== "closed";
  const orderId = sheet.mode === "edit" || sheet.mode === "details" ? sheet.orderId : undefined;
  const isCreate = sheet.mode === "create";
  const isEdit = sheet.mode === "edit";
  const isDetails = sheet.mode === "details";

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeSheet()}>
      <SheetContent className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="shrink-0">
          <SheetTitle>
            {isCreate ? copy.order.titleNew : isEdit ? copy.order.titleEdit : copy.order.details}
          </SheetTitle>
          <SheetDescription className="sr-only">{copy.summary.subtitle}</SheetDescription>
        </SheetHeader>
        {isDetails && orderId ? (
          <OrderDetails orderId={orderId} onEdit={() => openEdit(orderId)} onClose={closeSheet} />
        ) : isCreate || isEdit ? (
          <OrderForm
            key={isEdit ? orderId : "create"}
            orderId={isEdit ? orderId : undefined}
            onClose={closeSheet}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
