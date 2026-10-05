"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Appointment = {
  id: string;
  appointment_at: string;
  status: string;
  reason: string | null;
  doctor: { user: { name: string } } | null;
  department: { name: string } | null;
};

const statusClasses: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-800",
  confirmed: "bg-blue-50 text-blue-800",
  checked_in: "bg-amber-50 text-amber-800",
  completed: "bg-green-50 text-green-800",
  cancelled: "bg-red-50 text-red-700",
  no_show: "bg-red-50 text-red-700",
};

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
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-700">Your care</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Appointments</h1>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Appointment date range">
          {(["upcoming", "past"] as const).map((value) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${tab === value ? "bg-blue-700 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {value} ({value === "upcoming" ? upcoming.length : past.length})
            </button>
          ))}
        </div>
      </header>

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <section className="mt-5 border-y border-slate-200 bg-white sm:border">
        {!appointments ? <p className="p-10 text-center text-slate-500">Loading appointments…</p> : shown.length === 0 ? <p className="p-10 text-center text-slate-500">No {tab} appointments.</p> : (
          <ul className="divide-y divide-slate-100">
            {shown.map((appointment) => (
              <li key={appointment.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{new Date(appointment.appointment_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="mt-1 text-sm text-slate-500">{appointment.doctor?.user?.name ?? "Care team"} · {appointment.department?.name ?? "Hospital"}{appointment.reason ? ` · ${appointment.reason}` : ""}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses[appointment.status] ?? "bg-slate-100 text-slate-700"}`}>{appointment.status.replaceAll("_", " ")}</span>
                {tab === "upcoming" && ["scheduled", "confirmed"].includes(appointment.status) && (
                  <button type="button" disabled={busyId === appointment.id} onClick={() => cancel(appointment.id)} className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50">
                    {busyId === appointment.id ? "Cancelling…" : "Cancel"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
