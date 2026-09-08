// All formatting is in the user's LOCAL timezone (§83). Never hardcode a zone.

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** ISO -> local "YYYY-MM-DD". */
export function formatDate(iso: string): string {
  return localDateString(new Date(iso));
}

/** ISO -> local "HH:mm". */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** ISO -> local "YYYY-MM-DD HH:mm". */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/** Today's date as local "YYYY-MM-DD". */
export function todayLocalISO(): string {
  return localDateString(new Date());
}

/** Start of `date`'s local day as an ISO string. */
export function startOfDayISO(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  ).toISOString();
}

/** End of `date`'s local day as an ISO string. */
export function endOfDayISO(date: Date): string {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();
}
