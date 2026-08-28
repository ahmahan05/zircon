import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import {
  blobToBase64,
  canUseBrowserSpeech,
  startBrowserSpeech,
  startRecording,
  type VoiceErrorCode,
} from "@/lib/voice/capture";
import { parseVoiceOrder, type VoiceCatalog, type VoiceDraft } from "@/lib/voice/parse-order";
import { transcribeVoice } from "@/services/voice";

const MAX_MS = 25_000;

type Phase = "idle" | "listening" | "working";

export function VoiceDictation({
  copy,
  language,
  catalog,
  onParsed,
  disabled,
}: {
  copy: Dictionary;
  language: Language;
  catalog: VoiceCatalog;
  onParsed: (draft: VoiceDraft) => void | Promise<void>;
  disabled?: boolean;
}) {
  const v = copy.order.voice;
  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState("");
  const session = useRef<{
    stopSpeech?: () => Promise<string>;
    stopRec?: () => Promise<{ blob: Blob; mimeType: string }>;
    timer?: number;
  }>({});

  useEffect(() => {
    return () => {
      void abortSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fail(code: VoiceErrorCode) {
    const map: Record<VoiceErrorCode, string> = {
      unsupported: v.unsupported,
      denied: v.denied,
      empty: v.empty,
      network: v.network,
      unknown: v.failed,
    };
    toast.error(map[code] ?? v.failed);
    setPhase("idle");
  }

  async function abortSession() {
    const current = session.current;
    session.current = {};
    if (current.timer) window.clearTimeout(current.timer);
    try {
      await current.stopSpeech?.();
    } catch {
      /* ignore */
    }
    try {
      await current.stopRec?.();
    } catch {
      /* ignore */
    }
  }

  async function finish() {
    const current = session.current;
    session.current = {};
    if (current.timer) window.clearTimeout(current.timer);
    setPhase("working");
    let transcript = live.trim();
    try {
      const spoken = (await current.stopSpeech?.())?.trim();
      if (spoken) transcript = spoken;
    } catch {
      /* keep live */
    }
    if (!transcript) {
      try {
        const rec = await current.stopRec?.();
        if (rec && rec.blob.size > 80) {
          const audio = await blobToBase64(rec.blob);
          const result = await transcribeVoice({
            data: { audio, mimeType: rec.mimeType },
          });
          if (result.ok) transcript = result.text;
        }
      } catch (err) {
        const code = (err as { code?: VoiceErrorCode }).code;
        fail(code ?? "unknown");
        setLive("");
        return;
      }
    } else {
      void current.stopRec?.();
    }

    if (!transcript) {
      fail("empty");
      setLive("");
      return;
    }

    const draft = parseVoiceOrder(transcript, catalog);
    if (draft.filled.length === 0) {
      draft.notes = transcript;
      draft.filled.push("notes");
    }
    await onParsed(draft);
    const labels = draft.filled
      .map((key) => {
        if (key === "orderNumber") return copy.order.number;
        if (key === "doctor") return copy.order.doctor;
        if (key === "patient") return copy.order.patient;
        if (key === "color") return copy.order.color;
        if (key === "works") return copy.order.works;
        if (key === "notes") return copy.order.notes;
        return key;
      })
      .join(" · ");
    toast(v.applied, { description: labels });
    setLive("");
    setPhase("idle");
  }

  async function start() {
    setLive("");
    try {
      if (canUseBrowserSpeech()) {
        const speech = startBrowserSpeech(
          language,
          (text) => setLive(text),
          (code) => {
            if (code === "empty") return;
            fail(code);
          },
        );
        session.current.stopSpeech = speech.stop;
      } else {
        const rec = await startRecording();
        session.current.stopRec = rec.stop;
      }
      setPhase("listening");
      session.current.timer = window.setTimeout(() => {
        void finish();
      }, MAX_MS);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") fail("denied");
      else if (name === "NotFoundError") fail("unsupported");
      else fail("unsupported");
      setPhase("idle");
    }
  }

  const listening = phase === "listening";
  const working = phase === "working";

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={listening ? "destructive" : "outline"}
          className={cn("h-11 min-w-11 rounded-xl px-3", listening && "voice-pulse")}
          disabled={disabled || working}
          onClick={() => {
            if (listening) void finish();
            else void start();
          }}
          aria-pressed={listening}
          aria-label={listening ? v.stop : v.start}
        >
          {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
          {working ? v.working : listening ? v.listening : v.start}
        </Button>
        {live ? (
          <p className="min-w-0 flex-1 truncate text-sm text-foreground">{live}</p>
        ) : (
          <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">{v.hint}</p>
        )}
      </div>
    </div>
  );
}
