"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Doctor = { id: number; specialization: string | null; user: { name: string }; department: { name: string } | null };

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

export default function BookPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState("");
  const [fee, setFee] = useState("0");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/lookups/doctors"), api.get("/settings")])
      .then(([doctorResponse, settingsResponse]) => {
        setDoctors(doctorResponse.data);
        setFee(settingsResponse.data.consultation_fee ?? "0");
      })
      .catch(() => setError("Could not load booking options. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    setError("");
    if (!doctorId) return setError("Select a doctor.");
    if (!when) return setError("Choose a date and time.");
    setSaving(true);
    try {
      await api.post("/portal/appointments", {
        doctor_id: Number(doctorId),
        appointment_at: new Date(when).toISOString(),
        reason: reason.trim() || undefined,
      });
      router.push("/portal/appointments");
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? "Could not book this appointment. Try another time.");
    } finally {
      setSaving(false);
    }
  }

  const selectedDoctor = doctors.find((d) => String(d.id) === doctorId);

  return (
    <div className="animate-fade-up w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Book a visit</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Choose an available doctor and a future time.</p>
      </div>

      <div className={`${cardCls} overflow-hidden`}>
        <div className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
          <h2 className="flex items-center gap-2 font-heading font-semibold text-[var(--ink)]">
            <svg {...iconProps} className="h-4 w-4 text-[var(--primary)]"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
            Appointment details
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div className="mb-1.5 h-3.5 w-24 animate-pulse rounded bg-[var(--primary-tint)]/20" />
                  <div className="h-10 animate-pulse rounded-xl bg-[var(--primary-tint)]/15" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Doctor picker as cards (better UX than a bare select) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--ink)]">Doctor *</label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {doctors.map((doctor) => {
                    const active = String(doctor.id) === doctorId;
                    return (
                      <button
                        key={doctor.id}
                        type="button"
                        onClick={() => setDoctorId(String(doctor.id))}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-[var(--primary)] bg-[var(--primary-tint)]/15 shadow-sm"
                            : "border-[var(--border)] hover:border-[var(--primary-tint)] hover:bg-[var(--primary-tint)]/10"
                        }`}
                      >
                        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full font-heading text-sm font-semibold ${
                          active ? "bg-[var(--primary)] text-white" : "bg-[var(--primary-tint)]/25 text-[var(--primary)]"
                        }`}>
                          {doctor.user.name.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className={`block truncate text-sm font-medium ${active ? "text-[var(--ink)]" : "text-[var(--ink)]"}`}>
                            {doctor.user.name}
                          </span>
                          <span className="block truncate text-xs text-[var(--muted)]">
                            {doctor.specialization ?? "General"}
                            {doctor.department ? ` · ${doctor.department.name}` : ""}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="appointment-time" className="mb-1 block text-sm font-medium text-[var(--ink)]">Date and time *</label>
                  <input id="appointment-time" type="datetime-local" required value={when} onChange={(event) => setWhen(event.target.value)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="reason" className="mb-1 block text-sm font-medium text-[var(--ink)]">Reason for visit</label>
                  <input id="reason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional" className={inputCls} />
                </div>
              </div>

              {/* selected doctor summary + fee */}
              {selectedDoctor && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--primary-tint)]/50 bg-[var(--primary-tint)]/10 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <svg {...iconProps} className="h-4 w-4 text-[var(--primary)]"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <div className="text-sm">
                      <b className="font-medium text-[var(--ink)]">Dr. {selectedDoctor.user.name}</b>
                      <span className="text-[var(--muted)]"> · {selectedDoctor.specialization ?? "General"}</span>
                    </div>
                  </div>
                  {when && (
                    <span className="text-xs tabular-nums text-[var(--muted)]">
                      {new Date(when).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              )}

              {Number(fee) > 0 && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <svg {...iconProps} className="mt-0.5 h-4 w-4 flex-none text-amber-600"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
                  <p className="text-sm text-amber-800">
                    Consultation fee: <b>${Number(fee).toFixed(2)}</b>. A pending bill will be added to your account, payable at reception.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  <svg {...iconProps} className="h-4 w-4 flex-none"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button type="button" onClick={submit} disabled={saving || loading || doctors.length === 0}
                  className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
                  {saving ? "Booking…" : "Confirm booking"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}