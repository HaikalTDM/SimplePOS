// Blob <-> data-URL codec for the backup JSON. Manual base64 parsing on both
// sides: deterministic, synchronous on import, and independent of fetch/
// FileReader so it works in browsers, jsdom tests, and offline.

const CHUNK = 0x8000;

/** Blob -> "data:<type>;base64,<b64>" via arrayBuffer (no FileReader). */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
}

/** "data:<mime>;base64,<b64>" -> Blob. Throws on malformed input. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const headerEnd = dataUrl.indexOf(",");
  if (headerEnd < 0) throw new Error("Invalid data URL");
  const header = dataUrl.slice(0, headerEnd);
  const mimeMatch = /^data:([^;]*)/.exec(header);
  const type =
    mimeMatch && mimeMatch[1] ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(dataUrl.slice(headerEnd + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}
