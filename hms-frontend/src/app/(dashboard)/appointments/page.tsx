"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Doctor = {
  id: number;
  specialization: string | null;
  department_id: number | null;
  user: { name: string };
  department: { name: string } | null;
};

type PatientRow = { id: string; mrn: string; first_name: string; last_name: string };

type Appointment = {
  id: string;
  appointment_at: string;
  status: string;
  reason: string | null;
  patient: { mrn: string; first_name: string; last_name: string } | null;
  doctor: { user: { name: string } } | null;
  department: { name: string } | null;
};

type Paginated = { data: Appointment[]; current_page: number; last_page: number; total: number };

const statusPill: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-blue-50 text-blue-700",
  checked_in: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
  no_show: "bg-red-50 text-red-600",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function AppointmentsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async (p: number, s: string, d: string) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/appointments", {
        params: { page: p, status: s || undefined, date: d || undefined },
      });
      setResult(data);
    } catch {
      setError("Could not load appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, status, date);
  }, [page, status, date, load]);

  async function cancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    await api.put(`/appointments/${id}`, { status: "cancelled" });
    load(page, status, date);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Appointments</h1>
          <p className="mt-1 text-sm text-slate-500">{result ? `${result.total} appointments` : "Loading…"}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + Book appointment
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm capitalize outline-none focus:border-blue-600"
        >
          <option value="">All statuses</option>
          {Object.keys(statusPill).map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setPage(1); }}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-600"
        />
        {(status || date) && (
          <button
            onClick={() => { setStatus(""); setDate(""); setPage(1); }}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">{error}</div>
        ) : !result?.data.length ? (
          <div className="p-12 text-center text-slate-500">No appointments found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-6 py-4 font-medium">When</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {result.data.map((a) => {
                const t = fmt(a.appointment_at);
                return (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium tabular-nums text-slate-900">{t.date}</div>
                      <div className="text-xs text-slate-500">{t.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">
                        {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}
                      </div>
                      <div className="text-xs text-blue-700">{a.patient?.mrn}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{a.doctor?.user?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-slate-600">{a.department?.name ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusPill[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {a.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {["scheduled", "confirmed"].includes(a.status) && (
                        <button onClick={() => cancel(a.id)} className="text-xs font-medium text-red-600 hover:underline">
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {result && result.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <span className="text-sm text-slate-500">Page {result.current_page} of {result.last_page}</span>
            <div className="flex gap-2">
              <button disabled={result.current_page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                ← Previous
              </button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <BookModal
          onClose={() => setShowModal(false)}
          onBooked={() => { setShowModal(false); setPage(1); load(1, status, date); }}
        />
      )}
    </div>
  );
}

/* ---------- Booking modal ---------- */

function BookModal({ onClose, onBooked }: { onClose: () => void; onBooked: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<PatientRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDateTime(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    api.get("/lookups/doctors").then((r) => setDoctors(r.data)).catch(() => {});
  }, []);

  async function searchPatients() {
    if (!q.trim()) return;
    const { data } = await api.get("/patients", { params: { search: q } });
    setMatches(data.data.slice(0, 5));
  }

  async function submit() {
    setError("");
    if (!patient) return setError("Select a patient.");
    if (!doctorId) return setError("Select a doctor.");
    if (!when) return setError("Pick a date and time.");
    setSaving(true);
    const doctor = doctors.find((d) => String(d.id) === doctorId);
    try {
      await api.post("/appointments", {
        patient_id: patient.id,
        doctor_id: Number(doctorId),
        department_id: doctor?.department_id ?? null,
        appointment_at: new Date(when).toISOString(),
        duration_minutes: 30,
        reason: reason || undefined,
      });
      onBooked();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Could not book. Try a different time.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Book appointment</h2>

        <div className="mt-5 space-y-4">
          {/* Patient search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patient</label>
            {patient ? (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 text-sm">
                <span className="text-slate-900">
                  <b>{patient.first_name} {patient.last_name}</b>{" "}
                  <span className="text-blue-700">{patient.mrn}</span>
                </span>
                <button onClick={() => setPatient(null)} className="text-slate-500 hover:text-red-600">✕</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchPatients())}
                    placeholder="Search by name or MRN…"
                    className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                  <button onClick={searchPatients} className="rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200">
                    Search
                  </button>
                </div>
                {matches.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <button
                          onClick={() => { setPatient(m); setMatches([]); }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                        >
                          {m.first_name} {m.last_name} <span className="text-blue-700">{m.mrn}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Doctor */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Select doctor…</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.user.name}{d.specialization ? ` — ${d.specialization}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date & time */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date & time</label>
            <input
              type="datetime-local"
              min={minDateTime}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Routine checkup"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Booking…" : "Book appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}