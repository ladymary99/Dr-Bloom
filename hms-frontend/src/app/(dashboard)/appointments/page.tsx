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
  scheduled: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  confirmed: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  checked_in: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
  no_show: "bg-red-100 text-red-600",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

const inputCls =
  "rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

export default function AppointmentsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<"today" | "all">("today");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
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

  function setTabAndDate(t: "today" | "all") {
    setTab(t);
    setPage(1);
    setDate(t === "today" ? new Date().toISOString().slice(0, 10) : "");
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Appointments</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{result ? `${result.total} appointments` : "Loading…"}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20"
        >
          + Book appointment
        </button>
      </div>

      {/* Tabs + Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-[var(--border)] bg-white p-1 shadow-sm">
          <button
            onClick={() => setTabAndDate("today")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === "today" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:bg-[var(--primary-tint)]/15 hover:text-[var(--ink)]"}`}
          >
            Today
          </button>
          <button
            onClick={() => setTabAndDate("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === "all" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:bg-[var(--primary-tint)]/15 hover:text-[var(--ink)]"}`}
          >
            All appointments
          </button>
        </div>

        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm capitalize text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30"
        >
          <option value="">All statuses</option>
          {Object.keys(statusPill).map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>

        {tab === "all" && (
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30"
          />
        )}

        {(status || (tab === "all" && date)) && (
          <button
            onClick={() => { setStatus(""); setTabAndDate("all"); }}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        {error ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
          </div>
        ) : !loading && !result?.data.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No appointments found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-4">When</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/60 last:border-0">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-[var(--primary-tint)]/20" style={{ width: `${50 + ((i * 9 + j * 13) % 40)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : result!.data.map((a) => {
                    const t = fmt(a.appointment_at);
                    return (
                      <tr key={a.id} className="border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10">
                        <td className="px-6 py-4">
                          <div className="font-medium tabular-nums text-[var(--ink)]">{t.date}</div>
                          <div className="text-xs tabular-nums text-[var(--muted)]">{t.time}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-[var(--ink)]">
                            {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}
                          </div>
                          <div className="text-xs font-medium text-[var(--primary)]">{a.patient?.mrn}</div>
                        </td>
                        <td className="px-6 py-4 text-[var(--muted)]">{a.doctor?.user?.name ?? "—"}</td>
                        <td className="px-6 py-4 text-[var(--muted)]">{a.department?.name ?? "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusPill[a.status] ?? "bg-[var(--primary-tint)]/15 text-[var(--muted)]"}`}>
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {["scheduled", "confirmed"].includes(a.status) && (
                            <button onClick={() => cancel(a.id)} className="text-xs font-medium text-red-600 transition hover:text-red-700 hover:underline">
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
          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
            <span className="text-sm tabular-nums text-[var(--muted)]">Page {result.current_page} of {result.last_page}</span>
            <div className="flex gap-2">
              <button disabled={result.current_page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]">
                ← Previous
              </button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]">
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
        // clinic wall-clock time, no timezone conversion; duration defaults to the doctor's slot length
        appointment_at: when.length === 16 ? `${when}:00` : when,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Book appointment</h2>

        <div className="mt-5 space-y-4">
          {/* Patient search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Patient</label>
            {patient ? (
              <div className="flex items-center justify-between rounded-xl bg-[var(--primary-tint)]/15 px-4 py-2.5 text-sm">
                <span className="text-[var(--ink)]">
                  <b>{patient.first_name} {patient.last_name}</b>{" "}
                  <span className="font-medium text-[var(--primary)]">{patient.mrn}</span>
                </span>
                <button onClick={() => setPatient(null)} className="text-[var(--muted)] transition hover:text-red-600">✕</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchPatients())}
                    placeholder="Search by name or MRN…"
                    className={inputCls + " flex-1"}
                  />
                  <button onClick={searchPatients} className="rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">
                    Search
                  </button>
                </div>
                {matches.length > 0 && (
                  <ul className="mt-2 divide-y divide-[var(--border)]/60 overflow-hidden rounded-xl border border-[var(--border)]">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <button
                          onClick={() => { setPatient(m); setMatches([]); }}
                          className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-[var(--primary-tint)]/10"
                        >
                          <span className="font-medium text-[var(--ink)]">{m.first_name} {m.last_name}</span>{" "}
                          <span className="text-[var(--primary)]">{m.mrn}</span>
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
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className={inputCls + " w-full"}
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
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Date & time</label>
            <input
              type="datetime-local"
              min={minDateTime}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className={inputCls + " w-full"}
            />
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Routine checkup"
              className={inputCls + " w-full"}
            />
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saving ? "Booking…" : "Book appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}