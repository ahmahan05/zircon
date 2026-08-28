import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppState } from "@/features/app-state";
import { exportData, exportExcel, importData, listExportMonths, previewImportFile } from "@/services/backup";
import { decodeBase64, triggerDownload, triggerDownloadBytes } from "@/lib/download";
import type { ImportPreview, Language } from "@/lib/types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function DataBackup({ onImported }: { onImported: () => Promise<void> }) {
  const { copy, settings } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<{ url: string; filename: string } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingJson, setPendingJson] = useState<unknown>(null);

  const months = useQuery({
    queryKey: ["export-months"],
    queryFn: () => listExportMonths(),
  });

  useEffect(() => {
    if (!months.data?.length) return;
    if (period !== "all" && !months.data.some((row) => row.key === period)) {
      setPeriod(months.data[0]?.key ?? "all");
    }
  }, [months.data, period]);

  useEffect(() => {
    return () => {
      if (ready) URL.revokeObjectURL(ready.url);
    };
  }, [ready]);

  function rememberFile(filename: string, url: string) {
    if (ready) URL.revokeObjectURL(ready.url);
    setReady({ url, filename });
  }

  async function runExport(kind: "json" | "xlsx") {
    setBusy(true);
    try {
      const payload = period === "all" ? {} : { month: period };
      if (kind === "json") {
        const file = await exportData({ data: payload });
        rememberFile(file.filename, triggerDownload(file.filename, file.json, "application/json"));
      } else {
        const file = await exportExcel({ data: payload });
        rememberFile(file.filename, triggerDownloadBytes(file.filename, decodeBase64(file.base64), XLSX_MIME));
      }
      toast(copy.settings.exported);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.settings.exportFailed);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      const result = await previewImportFile({ data: { json } });
      setPendingJson(json);
      setPreview(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.common.errorGeneric);
    }
  }

  async function confirmImport(mode: "merge" | "replace") {
    if (!pendingJson) return;
    try {
      await importData({ data: { json: pendingJson, mode } });
      toast(copy.settings.imported);
      setPreview(null);
      setPendingJson(null);
      await onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy.common.errorGeneric);
    }
  }

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">{copy.settings.data}</h2>
        <Card className="space-y-4 rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">{copy.settings.exportHint}</p>
          <div className="max-w-xs">
            <Label>{copy.settings.exportPeriod}</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.settings.exportAll}</SelectItem>
                {(months.data ?? []).map((row) => (
                  <SelectItem key={row.key} value={row.key}>
                    {monthLabel(row.key, settings.language)} · {row.orders}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void runExport("xlsx")} disabled={busy}>
              {busy ? copy.settings.exporting : copy.settings.exportExcel}
            </Button>
            <Button variant="outline" onClick={() => void runExport("json")} disabled={busy}>
              {copy.settings.exportJson}
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              {copy.settings.restoreBackup}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = "";
              }}
            />
          </div>
          {ready ? (
            <a
              href={ready.url}
              download={ready.filename}
              className="inline-flex text-sm font-medium text-foreground underline underline-offset-4"
            >
              {copy.settings.exportReady} ({ready.filename})
            </a>
          ) : null}
        </Card>
      </section>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.settings.preview}</DialogTitle>
            <DialogDescription>
              v{preview?.version} · {preview?.exportedAt ?? ""}
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <ul className="space-y-1 text-sm">
              <li>
                {copy.doctors.title}: {preview.counts.doctors}
              </li>
              <li>
                {copy.summary.tableTitle}: {preview.counts.orders}
              </li>
              <li>
                {copy.settings.workTypes}: {preview.counts.workTypes}
              </li>
              <li>
                {copy.settings.colors}: {preview.counts.colors}
              </li>
            </ul>
          ) : null}
          {preview?.conflicts.length ? (
            <div className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
              {preview.conflicts.join(". ")}
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">{copy.settings.dangerReplace}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              {copy.settings.cancel}
            </Button>
            <Button variant="secondary" onClick={() => void confirmImport("merge")}>
              {copy.settings.merge}
            </Button>
            <Button variant="destructive" onClick={() => void confirmImport("replace")}>
              {copy.settings.replace}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function monthLabel(key: string, lang: Language): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  const raw = new Date(year, month - 1, 1).toLocaleString(lang === "ru" ? "ru-RU" : "en-US", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
