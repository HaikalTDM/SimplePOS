import { localDateOf } from "../../utils/dates";
import { sanitizeFilename } from "../../utils/filename";
import type { BackupFile } from "./types";

export interface DownloadFile {
  blob: Blob;
  filename: string;
}

/** §60 — the backup .json file, without touching the DOM (test-friendly). */
export function buildBackupFile(backup: BackupFile): DownloadFile {
  return {
    blob: new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    }),
    filename: `SimplePOS-Backup-${sanitizeFilename(backup.stall?.name ?? "SimplePOS")}-${localDateOf(backup.exportedAt)}.json`,
  };
}

/**
 * Browser-side download via a temporary <a download>. No-op where there is
 * no download surface (jsdom tests, restricted browsers).
 */
export function triggerDownload(file: DownloadFile): void {
  try {
    if (typeof document === "undefined") return;
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // No download surface: nothing to do.
  }
}
