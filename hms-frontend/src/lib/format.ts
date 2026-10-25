import { currentLocale } from "@/lib/i18n";

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "USD";

export function money(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  try {
    return new Intl.NumberFormat(currentLocale(), { style: "currency", currency: CURRENCY }).format(n);
  } catch {
    return `${n.toFixed(2)} ${CURRENCY}`;
  }
}

/**
 * Appointment times arrive as clinic wall-clock strings without a timezone ("2026-10-26T09:00:00"),
 * which the browser parses as local time and therefore displays exactly as booked.
 */
export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString(currentLocale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtShortDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString(currentLocale(), { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtTime = (s?: string | null) =>
  s ? new Date(s).toLocaleTimeString(currentLocale(), { hour: "2-digit", minute: "2-digit" }) : "—";
export const fmtDateTime = (s?: string | null) => (s ? `${fmtDate(s)} · ${fmtTime(s)}` : "—");

/** "2026-10-26" + "09:30" → Date in local time (no UTC shift). */
export const wallDate = (day: string, hhmm = "00:00") => new Date(`${day}T${hhmm}:00`);

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const addDays = (day: string, n: number) => {
  const d = wallDate(day);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function apiError(e: unknown, fallback = "Something went wrong. Please try again."): string {
  const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const first = err.response?.data?.errors ? Object.values(err.response.data.errors)[0]?.[0] : undefined;
  return first ?? err.response?.data?.message ?? fallback;
}

/** Fetch a protected file through the API (Bearer token) and hand it to the browser. */
export async function downloadFile(
  api: { get: (url: string, cfg: { responseType: "blob" }) => Promise<{ data: Blob; headers: Record<string, string> }> },
  url: string,
  filename: string
) {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 5000);
}

export function bytes(n?: number | null) {
  if (!n) return "";
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`;
}
