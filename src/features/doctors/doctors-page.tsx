import { Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { useAppState } from "@/features/app-state";
import { listDoctors, saveDoctor } from "@/services/doctors";
import { formatDate, money } from "@/lib/format";
import { invalidateJournal, journalKeys } from "@/lib/query";

export function DoctorsPage() {
  const { copy, settings } = useAppState();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const query = useQuery({ queryKey: journalKeys.doctors, queryFn: () => listDoctors() });

  const mutation = useMutation({
    mutationFn: () =>
      saveDoctor({
        data: { payload: { name, phone: phone || undefined, notes: notes || undefined } },
      }),
    onSuccess: async () => {
      toast(copy.doctors.saved);
      setOpen(false);
      setName("");
      setPhone("");
      setNotes("");
      await invalidateJournal(queryClient);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.doctors.title}
        subtitle={copy.doctors.subtitle}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            {copy.doctors.add}
          </Button>
        }
      />

      {query.isLoading ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : !query.data?.length ? (
        <Card>
          <EmptyState
            title={copy.doctors.emptyTitle}
            body={copy.doctors.emptyBody}
            action={() => setOpen(true)}
            actionLabel={copy.doctors.add}
          />
        </Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-border)] md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">{copy.doctors.colDoctor}</th>
                  <th className="px-4 py-3">{copy.doctors.colOrders}</th>
                  <th className="px-4 py-3">{copy.doctors.colWorks}</th>
                  <th className="px-4 py-3">{copy.doctors.colRevenue}</th>
                  <th className="px-4 py-3">{copy.doctors.colLast}</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/60">
                    <td className="px-4 py-3">
                      <Link to="/doctors/$id" params={{ id: row.id }} className="font-medium hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.orders}</td>
                    <td className="px-4 py-3 tabular-nums">{row.units}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {money(row.revenue, settings.currency, settings.language)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(row.lastWorkAt, settings.dateFormat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 md:hidden">
            {query.data.map((row) => (
              <Link
                key={row.id}
                to="/doctors/$id"
                params={{ id: row.id }}
                className="block rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]"
              >
                <div className="font-medium">{row.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {row.orders} · {row.units} · {money(row.revenue, settings.currency, settings.language)}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.doctors.add}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
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
            <div className="space-y-1.5">
              <Label htmlFor="doc-notes">{copy.doctors.notes}</Label>
              <Textarea
                id="doc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={copy.doctors.notesHint}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {copy.common.cancel}
              </Button>
              <Button type="submit" disabled={mutation.isPending || !name.trim()}>
                {copy.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
