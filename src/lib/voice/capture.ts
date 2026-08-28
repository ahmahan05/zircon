export type VoiceErrorCode =
  | "unsupported"
  | "denied"
  | "empty"
  | "network"
  | "unknown";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: SpeechResultEvent) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isSafariLike(): boolean {
  if (typeof navigator === "undefined") return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function canUseBrowserSpeech(): boolean {
  return Boolean(speechCtor()) && !isSafariLike();
}

export function startBrowserSpeech(
  lang: string,
  onTranscript: (text: string, interim: boolean) => void,
  onError: (code: VoiceErrorCode) => void,
): { stop: () => Promise<string> } {
  const Ctor = speechCtor();
  if (!Ctor) {
    onError("unsupported");
    return { stop: async () => "" };
  }
  const rec = new Ctor();
  rec.lang = lang === "en" ? "en-US" : "ru-RU";
  rec.interimResults = true;
  rec.continuous = true;
  let finalText = "";
  let ended = false;
  let settle: ((text: string) => void) | null = null;

  rec.onresult = (ev) => {
    let interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const piece = ev.results[i];
      const chunk = piece[0]?.transcript ?? "";
      if (piece.isFinal) finalText = `${finalText} ${chunk}`.trim();
      else interim += chunk;
    }
    onTranscript(finalText, false);
    if (interim) onTranscript(`${finalText} ${interim}`.trim(), true);
  };
  rec.onerror = (ev) => {
    if (ev.error === "not-allowed" || ev.error === "service-not-allowed") onError("denied");
    else if (ev.error === "network") onError("network");
    else if (ev.error === "no-speech") onError("empty");
    else if (ev.error !== "aborted") onError("unknown");
  };
  rec.onend = () => {
    ended = true;
    settle?.(finalText.trim());
  };

  try {
    rec.start();
  } catch {
    onError("unknown");
  }

  return {
    stop: () =>
      new Promise((resolve) => {
        if (ended) {
          resolve(finalText.trim());
          return;
        }
        settle = resolve;
        try {
          rec.stop();
        } catch {
          resolve(finalText.trim());
        }
        window.setTimeout(() => resolve(finalText.trim()), 1200);
      }),
  };
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export async function startRecording(): Promise<{
  stop: () => Promise<{ blob: Blob; mimeType: string }>;
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error("unsupported"), { code: "unsupported" as const });
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickMime();
  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.start(200);
  return {
    stop: () =>
      new Promise((resolve, reject) => {
        recorder.onerror = () => {
          stopTracks(stream);
          reject(Object.assign(new Error("unknown"), { code: "unknown" as const }));
        };
        recorder.onstop = () => {
          stopTracks(stream);
          const type = recorder.mimeType || mime || "audio/webm";
          resolve({ blob: new Blob(chunks, { type }), mimeType: type });
        };
        try {
          recorder.stop();
        } catch (err) {
          stopTracks(stream);
          reject(err);
        }
      }),
  };
}

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
