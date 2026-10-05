"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Doctor = { id: number; specialization: string | null; user: { name: string }; department: { name: string } | null };

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

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

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

  return (
    <div className="max-w-2xl">
      <header>
        <p className="text-sm font-medium text-blue-700">Appointments</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Book a visit</h1>
        <p className="mt-1 text-sm text-slate-500">Choose an available doctor and a future time.</p>
      </header>

      <section className="mt-6 border-y border-slate-200 bg-white px-5 py-6 sm:border sm:px-6">
        {loading ? <p className="py-8 text-center text-slate-500">Loading booking options…</p> : (
          <div className="space-y-4">
            <div>
              <label htmlFor="doctor" className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
              <select id="doctor" required value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className={inputClass}>
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user.name}{doctor.specialization ? ` · ${doctor.specialization}` : ""}{doctor.department ? ` (${doctor.department.name})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="appointment-time" className="mb-1 block text-sm font-medium text-slate-700">Date and time</label>
              <input id="appointment-time" type="datetime-local" required value={when} onChange={(event) => setWhen(event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="reason" className="mb-1 block text-sm font-medium text-slate-700">Reason for visit</label>
              <input id="reason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional" className={inputClass} />
            </div>
            {Number(fee) > 0 && <p className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">Consultation fee: <b>${Number(fee).toFixed(2)}</b>. A pending bill will be added to your account, payable at reception.</p>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="button" onClick={submit} disabled={saving || loading || doctors.length === 0}
              className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
              {saving ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
