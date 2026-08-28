import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { VOICE_KEYTERMS } from "@/lib/voice/parse-order";

const MAX_AUDIO_CHARS = 1_800_000;

function filenameFor(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "voice.m4a";
  if (mime.includes("ogg")) return "voice.ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "voice.mp3";
  if (mime.includes("wav")) return "voice.wav";
  return "voice.webm";
}

export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        audio: z.string().min(8).max(MAX_AUDIO_CHARS),
        mimeType: z.string().min(3).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "unavailable" as const };

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
    } catch {
      return { ok: false as const, error: "invalid" as const };
    }
    if (bytes.byteLength < 64) return { ok: false as const, error: "empty" as const };
    if (bytes.byteLength > 1_200_000) return { ok: false as const, error: "too_large" as const };

    const form = new FormData();
    form.append("language", "ru");
    form.append("format", "true");
    for (const term of VOICE_KEYTERMS) form.append("keyterm", term);
    const audio = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(audio).set(bytes);
    form.append(
      "file",
      new Blob([audio], { type: data.mimeType || "audio/webm" }),
      filenameFor(data.mimeType),
    );

    const res = await fetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      return { ok: false as const, error: "upstream" as const };
    }
    const body = (await res.json()) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (!text) return { ok: false as const, error: "empty" as const };
    return { ok: true as const, text };
  });
