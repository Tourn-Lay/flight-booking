import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// All schedule times are shown in the operating time zone of the system (Cambodia).
export const DISPLAY_TZ = "Asia/Phnom_Penh";

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: DISPLAY_TZ }).format(
    new Date(iso),
  );
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: DISPLAY_TZ,
    ...opts,
  }).format(new Date(iso));
}

export function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: DISPLAY_TZ,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatMoney(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/** yyyy-MM-dd for a local Date (what the API expects). */
export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "2026-10-20T08:00" typed in a datetime-local input (system time zone) -> ISO with offset. */
export function localInputToISO(value: string) {
  return `${value}:00+07:00`; // Cambodia (UTC+7, no daylight saving)
}

/** ISO instant -> "yyyy-MM-ddTHH:mm" in the system time zone for datetime-local inputs. */
export function isoToLocalInput(iso: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: DISPLAY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}
