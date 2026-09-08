/** §60 — make a name safe for Windows/macOS/Linux filenames. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    // Windows-reserved characters (also fine to replace elsewhere).
    .replace(/[\\/:*?"<>|]/g, "-")
    // Control characters.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    // Leading dots are hidden files on macOS/Linux.
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 50)
    .trim();
  return cleaned === "" ? "SimplePOS" : cleaned;
}
