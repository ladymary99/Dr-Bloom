"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Appointment = {
  id: string;
  appointment_at: string;
  status: string;
  reason: string | null;
  doctor: { user: { name: string } } | null;
  department: { name: string } | null;
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm overflow-hidden";

const statusPill: Record<string, string> = {
  scheduled: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  confirmed: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  checked_in: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
  no_show: "bg-red-100 text-red-600",
};

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setError("");
    const response = await api.get("/portal/appointments");
    setAppointments(response.data);
  }, []);

  useEffect(() => {
    let active = true;
    api.get("/portal/appointments")
      .then((response) => {
        if (active) setAppointments(response.data);
      })
      .catch(() => {
        if (active) setError("Could not load appointments.");
      });

    return () => {
      active = false;
    };
  }, []);

  const upcoming = appointments?.filter((item) => new Date(item.appointment_at) >= new Date() && item.status !== "cancelled") ?? [];
  const past = appointments?.filter((item) => new Date(item.appointment_at) < new Date() || item.status === "cancelled") ?? [];
  const shown = tab === "upcoming" ? upcoming : past;

  async function cancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    setBusyId(id);
    setError("");
    try {
      await api.put(`/portal/appointments/${id}/cancel`);
      await load();
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? "Could not cancel this appointment.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="animate-fade-up w-full">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Appointments</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Your upcoming and past visits.</p>
        </div>
        <Link href="/portal/book"
          className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
          + Book appointment
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Appointment date range">
        {(["upcoming", "past"] as const).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
              tab === value
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--primary-tint)] hover:text-[var(--primary)]"
            }`}>
            {value} ({value === "upcoming" ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg {...iconProps} className="h-4 w-4 flex-none"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {error}
        </div>
      )}

      {/* List */}
      <div className={cardCls}>
        {!appointments ? (
          <ul className="divide-y divide-[var(--border)]/60">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 animate-pulse rounded bg-[var(--primary-tint)]/20" />
                  <div className="h-3 w-64 animate-pulse rounded bg-[var(--primary-tint)]/15" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-[var(--primary-tint)]/15" />
              </li>
            ))}
          </ul>
        ) : shown.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No {tab} appointments.</p>
            {tab === "upcoming" && (
              <Link href="/portal/book" className="mt-2 inline-block text-sm font-medium text-[var(--primary)] hover:underline">
                Book one now →
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]/60">
            {shown.map((appointment) => (
              <li key={appointment.id} className="flex flex-wrap items-center gap-3 px-6 py-4 transition hover:bg-[var(--primary-tint)]/10">
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-semibold tabular-nums text-[var(--ink)]">
                    {new Date(appointment.appointment_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    {appointment.doctor?.user?.name ?? "Care team"} · {appointment.department?.name ?? "Hospital"}
                    {appointment.reason ? ` · ${appointment.reason}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusPill[appointment.status] ?? "bg-[var(--primary-tint)]/15 text-[var(--muted)]"}`}>
                  {appointment.status.replaceAll("_", " ")}
                </span>
                {tab === "upcoming" && ["scheduled", "confirmed"].includes(appointment.status) && (
                  <button type="button" disabled={busyId === appointment.id} onClick={() => cancel(appointment.id)}
                    className="text-sm font-medium text-red-600 transition hover:text-red-700 hover:underline disabled:opacity-50">
                    {busyId === appointment.id ? "Cancelling…" : "Cancel"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}