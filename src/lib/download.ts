export function triggerDownload(filename: string, content: string, mime: string): string {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  return clickBlob(filename, blob);
}

export function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function triggerDownloadBytes(filename: string, bytes: Uint8Array, mime: string): string {
  const copy = Uint8Array.from(bytes);
  const blob = new Blob([copy.buffer], { type: mime });
  return clickBlob(filename, blob);
}

function clickBlob(filename: string, blob: Blob): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}
