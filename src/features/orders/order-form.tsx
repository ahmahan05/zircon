import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/features/shared/combobox";
import { useAppState } from "@/features/app-state";
import { VoiceDictation } from "@/features/orders/voice-dictation";
import { getNextOrderNumber, getOrder, saveOrder } from "@/services/orders";
import { saveDoctor } from "@/services/doctors";
import { money } from "@/lib/format";
import { minorToMajor, parseMajorInput } from "@/lib/money";
import { calculateLineTotal, calculateOrderTotal } from "@/lib/calculations/orders";
import { interpolate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { invalidateJournal, journalKeys } from "@/lib/query";
import type { VoiceDraft } from "@/lib/voice/parse-order";

interface DraftItem {
  key: string;
  workTypeId: string;
  quantity: number;
  unitPrice: number;
  priceInput: string;
}

function newItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    workTypeId: "",
    quantity: 1,
    unitPrice: 0,
    priceInput: "",
  };
}

function filledItems(items: DraftItem[]) {
  return items.filter((i) => i.workTypeId);
}

export function OrderForm({
  orderId,
  onClose,
}: {
  orderId?: string;
  onClose: () => void;
}) {
  const { lookups, copy, settings, refresh } = useAppState();
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: journalKeys.order(orderId),
    queryFn: () => getOrder({ data: { id: orderId! } }),
    enabled: Boolean(orderId),
  });
  const nextNumber = useQuery({
    queryKey: journalKeys.nextNumber,
    queryFn: () => getNextOrderNumber(),
    enabled: !orderId,
  });

  const [orderNumber, setOrderNumber] = useState("");
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [colorId, setColorId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId && nextNumber.data) setOrderNumber(nextNumber.data);
  }, [orderId, nextNumber.data]);

  useEffect(() => {
    const order = existing.data;
    if (!order) return;
    setOrderNumber(order.orderNumber);
    setDoctorId(order.doctorId);
    setPatientName(order.patientName);
    setColorId(order.colorId);
    setNotes(order.notes ?? "");
    setItems(
      order.items.length
        ? order.items.map((item) => ({
            key: item.id,
            workTypeId: item.workTypeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            priceInput: String(minorToMajor(item.unitPrice)),
          }))
        : [newItem()],
    );
  }, [existing.data]);

  const workTypes = (lookups?.workTypes ?? []).filter(
    (w) => w.isActive || items.some((i) => i.workTypeId === w.id),
  );
  const doctors = lookups?.doctors ?? [];
  const colors = (lookups?.colors ?? []).filter((c) => c.isActive || c.id === colorId);
  const readyItems = filledItems(items);
  const total = calculateOrderTotal(readyItems);

  const mutation = useMutation({
    mutationFn: () =>
      saveOrder({
        data: {
          id: orderId,
          payload: {
            orderNumber,
            doctorId: doctorId ?? undefined,
            patientName,
            colorId,
            notes: notes || undefined,
            items: readyItems.map((i) => ({
              workTypeId: i.workTypeId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        },
      }),
    onSuccess: async (result) => {
      const number = result.order?.orderNumber ?? orderNumber;
      toast(interpolate(copy.order.saved, { number }), {
        description: interpolate(copy.order.savedMeta, {
          count: result.order?.items.length ?? readyItems.length,
          total: money(result.total, settings.currency, settings.language),
        }),
      });
      await invalidateJournal(queryClient, result.order?.id);
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || copy.common.errorSave);
    },
  });

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function handleCreateDoctor(name: string) {
    const doctor = await saveDoctor({ data: { payload: { name } } });
    await refresh();
    if (doctor) setDoctorId(doctor.id);
  }

  async function applyVoice(draft: VoiceDraft) {
    if (draft.orderNumber) setOrderNumber(draft.orderNumber);
    if (draft.doctorId) setDoctorId(draft.doctorId);
    else if (draft.doctorName) await handleCreateDoctor(draft.doctorName);
    if (draft.patientName) setPatientName(draft.patientName);
    if (draft.colorId) setColorId(draft.colorId);
    if (draft.items.length) {
      setItems(
        draft.items.map((item) => ({
          key: crypto.randomUUID(),
          workTypeId: item.workTypeId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          priceInput: String(minorToMajor(item.unitPrice)),
        })),
      );
    }
    if (draft.notes) {
      setNotes((prev) => (prev ? `${prev}\n${draft.notes}` : draft.notes ?? ""));
    }
  }

  function onWorkType(key: string, workTypeId: string) {
    const wt = workTypes.find((w) => w.id === workTypeId);
    updateItem(key, {
      workTypeId,
      unitPrice: wt?.defaultPrice ?? 0,
      priceInput: wt ? String(minorToMajor(wt.defaultPrice)) : "",
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!orderNumber.trim()) {
      setError(copy.order.number);
      return;
    }
    if (!doctorId) {
      setError(copy.order.doctor);
      return;
    }
    if (!patientName.trim()) {
      setError(copy.order.patient);
      return;
    }
    if (readyItems.length === 0) {
      setError(copy.order.works);
      return;
    }
    mutation.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-6">
        <VoiceDictation
          copy={copy}
          language={settings.language}
          catalog={{ doctors, workTypes, colors }}
          onParsed={applyVoice}
          disabled={mutation.isPending}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="order-number">{copy.order.number}</Label>
            <Input
              id="order-number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder={copy.order.numberHint}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{copy.order.doctor}</Label>
            <Combobox
              options={doctors.map((d) => ({ value: d.id, label: d.name }))}
              value={doctorId}
              onChange={setDoctorId}
              placeholder={copy.order.doctorPlaceholder}
              createLabel={copy.order.addDoctor}
              onCreate={handleCreateDoctor}
              emptyText={copy.common.noResults}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="patient">{copy.order.patient}</Label>
            <Input
              id="patient"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder={copy.order.patientPlaceholder}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{copy.order.color}</Label>
            <Combobox
              options={colors.map((c) => ({ value: c.id, label: c.name }))}
              value={colorId}
              onChange={setColorId}
              placeholder={copy.order.noColor}
              allowClear
              clearLabel={copy.order.noColor}
              emptyText={copy.common.noResults}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{copy.order.works}</Label>
            <Button variant="ghost" size="sm" onClick={() => setItems((prev) => [...prev, newItem()])}>
              <Plus className="size-4" />
              {copy.order.addWork}
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((item) => {
              const line = calculateLineTotal(item);
              const canRemove = items.length > 1;
              return (
                <div
                  key={item.key}
                  className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
                >
                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground">{copy.order.workType}</div>
                    <Combobox
                      options={workTypes.map((w) => ({
                        value: w.id,
                        label: w.name,
                        hint: money(w.defaultPrice, settings.currency, settings.language),
                      }))}
                      value={item.workTypeId || null}
                      onChange={(id) => id && onWorkType(item.key, id)}
                      placeholder={copy.order.workPlaceholder}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground">{copy.order.qty}</div>
                    <div className="flex h-10 items-center rounded-lg border border-input bg-card">
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })
                        }
                        aria-label="-"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        className="w-10 bg-transparent text-center text-sm tabular-nums outline-none"
                        value={item.quantity}
                        onChange={(e) => {
                          const n = Number.parseInt(e.target.value, 10);
                          if (Number.isFinite(n) && n >= 1) updateItem(item.key, { quantity: n });
                          if (e.target.value === "") updateItem(item.key, { quantity: 1 });
                        }}
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        className="flex size-10 items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                        aria-label="+"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs text-muted-foreground">{copy.order.price}</div>
                    <Input
                      className="w-28 tabular-nums"
                      value={item.priceInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const minor = parseMajorInput(raw);
                        updateItem(item.key, {
                          priceInput: raw,
                          unitPrice: minor ?? item.unitPrice,
                        });
                      }}
                      onBlur={() => {
                        const minor = parseMajorInput(item.priceInput);
                        if (minor == null) {
                          updateItem(item.key, { unitPrice: 0, priceInput: "0" });
                          return;
                        }
                        updateItem(item.key, {
                          unitPrice: minor,
                          priceInput: String(minorToMajor(minor)),
                        });
                      }}
                      inputMode="decimal"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2 sm:justify-end">
                    <div className="pb-2 text-sm font-medium tabular-nums">
                      {money(line, settings.currency, settings.language)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={cn(!canRemove && "invisible")}
                      disabled={!canRemove}
                      onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                      aria-label={copy.common.delete}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-muted-foreground">{copy.order.total}</span>
            <span className="text-lg font-semibold tabular-nums">
              {money(total, settings.currency, settings.language)}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">{copy.order.notes}</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={copy.order.notesPlaceholder}
            rows={3}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border p-4">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={mutation.isPending}>
          {copy.order.cancel}
        </Button>
        <Button type="submit" className="flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? copy.order.saving : copy.order.save}
        </Button>
      </div>
    </form>
  );
}
