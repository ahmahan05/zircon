import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { useAppState } from "@/features/app-state";
import { deleteDoctor, getDoctorProfile, saveDoctor } from "@/services/doctors";
import { formatCount, formatDate, money } from "@/lib/format";
import { minorToMajor } from "@/lib/money";
import { invalidateJournal } from "@/lib/query";

export function DoctorProfilePage({ id }: { id: string }) {
  const { copy, settings, openDetails } = useAppState();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => getDoctorProfile({ data: { id } }),
  });
  const data = query.data;

  useEffect(() => {
    if (!data?.doctor) return;
    setName(data.doctor.name);
    setPhone(data.doctor.phone ?? "");
    setNotes(data.doctor.notes ?? "");
  }, [data?.doctor?.id, data?.doctor?.name, data?.doctor?.phone, data?.doctor?.notes]);

  const saveMut = useMutation({
    mutationFn: () =>
      saveDoctor({
        data: {
          id,
          payload: {
            name: name.trim(),
            phone: phone.trim() || undefined,
            notes: notes.trim() || undefined,
          },
        },
      }),
    onSuccess: async () => {
      toast(copy.doctors.saved);
      await invalidateJournal(queryClient);
    },
  });

  const delMut = useMutation({
    mutationFn: () => deleteDoctor({ data: { id } }),
    onSuccess: async () => {
      toast(copy.doctors.deleted);
      await invalidateJournal(queryClient);
      await navigate({ to: "/doctors" });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : copy.doctors.deleteBlocked);
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="text-sm text-muted-foreground">
        <Link to="/doctors" className="underline">
          {copy.doctors.title}
        </Link>
      </div>
    );
  }

  const dirty =
    name.trim() !== data.doctor.name ||
    (phone.trim() || "") !== (data.doctor.phone ?? "") ||
    (notes.trim() || "") !== (data.doctor.notes ?? "");

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.doctor.name}
        subtitle={copy.doctors.profile}
        actions={
          <Link to="/doctors" className="text-sm text-muted-foreground hover:text-foreground">
            {copy.doctors.title}
          </Link>
        }
      />

      <Card className="space-y-4 rounded-2xl p-5">
        <div className="text-sm font-medium">{copy.doctors.contact}</div>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) saveMut.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="doc-name">{copy.doctors.name}</Label>
            <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-phone">{copy.doctors.phone}</Label>
            <Input id="doc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="doc-notes">{copy.doctors.notes}</Label>
            <Textarea
              id="doc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={copy.doctors.notesHint}
              rows={3}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={saveMut.isPending || !name.trim() || !dirty}>
              {copy.doctors.save}
            </Button>
            {confirmDelete ? (
              <>
                <span className="self-center text-sm text-muted-foreground">
                  {copy.doctors.deleteConfirm}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={delMut.isPending}
                >
                  {copy.common.cancel}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => delMut.mutate()}
                  disabled={delMut.isPending}
                >
                  {copy.common.delete}
                </Button>
              </>
            ) : (
              <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                {copy.common.delete}
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={copy.doctors.colOrders} value={formatCount(data.orders, settings.language)} />
        <StatCard label={copy.doctors.colWorks} value={formatCount(data.units, settings.language)} />
        <StatCard
          label={copy.doctors.colRevenue}
          value={money(data.revenue, settings.currency, settings.language)}
        />
        <StatCard
          label={copy.doctors.average}
          value={money(data.averageCheck, settings.currency, settings.language)}
          hint={
            data.lastWorkAt
              ? `${copy.doctors.lastWork}: ${formatDate(data.lastWorkAt, settings.dateFormat)}`
              : undefined
          }
        />
      </div>

      <Card className="rounded-2xl p-5">
        <div className="text-sm font-medium">{copy.doctors.monthly}</div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthly} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
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
                }}
                formatter={(value) => money(Number(value), settings.currency, settings.language)}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--foreground)" fill="var(--foreground)" fillOpacity={0.08} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl p-5">
          <div className="text-sm font-medium">{copy.doctors.popular}</div>
          <div className="mt-4 space-y-2">
            {data.workTypes.slice(0, 6).map((row) => (
              <div key={row.workTypeId} className="flex justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.units} · {money(row.revenue, settings.currency, settings.language)}
                </span>
              </div>
            ))}
            {data.workTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.analytics.empty}</p>
            ) : null}
          </div>
        </Card>
        <Card className="rounded-2xl p-5">
          <div className="text-sm font-medium">{copy.doctors.history}</div>
          <div className="mt-3 divide-y divide-border">
            {data.recentOrders.slice(0, 8).map((row) => (
              <button
                key={row.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm"
                onClick={() => openDetails(row.id)}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    №{row.orderNumber} · {row.patientName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(row.createdAt, settings.dateFormat)}
                  </div>
                </div>
                <span className="tabular-nums">
                  {money(row.total, settings.currency, settings.language)}
                </span>
              </button>
            ))}
            {data.recentOrders.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">{copy.analytics.empty}</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
