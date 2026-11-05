"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { addDays, apiError, fmtDateTime, todayStr, wallDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { Field, Modal, Notice, btnGhost, btnPrimary, inputCls } from "@/components/ui";

type Doctor = { id: number; specialization: string | null; user: { name: string } };
type PatientRow = { id: string; mrn: string; first_name: string; last_name: string };
type Slots = { slot_minutes: number; accepts_online: boolean; accepts_in_person: boolean; days: Record<string, string[]> };

/** Staff booking: picks from the doctor's real free slots. Front desk / admin can override with a reason (logged). */
export default function BookAppointmentModal({ open, onClose, onBooked }: { open: boolean; onClose: () => void; onBooked: () => void }) {
  const roles = useAuthStore((s) => s.roles);
  const canOverride = roles.includes("admin") || roles.includes("receptionist");
  const doctorOnly = roles.includes("doctor") && !roles.includes("admin");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<PatientRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [slots, setSlots] = useState<Slots | null>(null);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [visitType, setVisitType] = useState<"in_person" | "online">("in_person");
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  const [freeWhen, setFreeWhen] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && !doctorOnly) api.get("/lookups/doctors").then((r) => setDoctors(r.data)).catch(() => {});
  }, [open, doctorOnly]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- slots belong to the selected doctor: clear them when it changes
    setSlots(null); setDay(""); setTime("");
    if (!doctorOnly && !doctorId) return;
    const url = doctorOnly ? "/doctor/slots" : `/appointment-slots/${doctorId}`;
    api.get<Slots>(url, { params: { from: todayStr(), to: addDays(todayStr(), 27) } })
      .then(({ data }) => { setSlots({ ...data, accepts_online: data.accepts_online ?? true, accepts_in_person: data.accepts_in_person ?? true }); setDay(Object.keys(data.days)[0] ?? ""); })
      .catch((e) => setError(apiError(e)));
  }, [open, doctorId, doctorOnly]);

  async function search() {
    if (!q.trim()) return;
    try { const { data } = await api.get("/patients", { params: { search: q } }); setMatches(data.data.slice(0, 5)); } catch (e) { setError(apiError(e)); }
  }

  const start = override ? freeWhen.replace("T", " ") : day && time ? `${day} ${time}` : "";

  async function submit() {
    setError("");
    if (!patient) return setError("Select a patient.");
    if (!doctorOnly && !doctorId) return setError("Select a doctor.");
    if (!start) return setError(override ? "Pick a date and time." : "Choose one of the free times.");
    setSaving(true);
    try {
      await api.post("/appointments", {
        patient_id: patient.id, doctor_id: doctorOnly ? undefined : Number(doctorId),
        appointment_at: `${start.length === 16 ? start : start.slice(0, 16)}:00`.replace(" ", "T"),
        reason: reason || undefined, visit_type: visitType,
        override: override || undefined, override_reason: override ? overrideReason : undefined,
      });
      reset(); onBooked();
    } catch (e) { setError(apiError(e, "Could not book. Try a different time.")); } finally { setSaving(false); }
  }

  function reset() { setQ(""); setMatches([]); setPatient(null); setDoctorId(""); setSlots(null); setDay(""); setTime(""); setReason(""); setOverride(false); setFreeWhen(""); setOverrideReason(""); setError(""); setVisitType("in_person"); }
  const close = () => { reset(); onClose(); };
  const keys = Object.keys(slots?.days ?? {});

  return (
    <Modal open={open} onClose={close} title="Book appointment" wide
      footer={<><button onClick={close} className={btnGhost}>Cancel</button><button onClick={submit} disabled={saving} className={btnPrimary}>{saving ? "Booking…" : "Book appointment"}</button></>}>
      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-xs font-semibold">Patient</p>
          {patient ? (
            <div className="flex items-center justify-between rounded-xl bg-[var(--primary-tint)]/15 px-4 py-2.5 text-sm"><span><b>{patient.first_name} {patient.last_name}</b> <span className="text-[var(--primary)]">{patient.mrn}</span></span><button onClick={() => setPatient(null)} aria-label="Change patient" className="text-[var(--muted)] hover:text-red-700">✕</button></div>
          ) : (
            <>
              <div className="flex gap-2"><label htmlFor="bk-q" className="sr-only">Search patient</label><input id="bk-q" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())} placeholder="Name or MRN…" className={inputCls} /><button onClick={search} className={btnGhost}>Search</button></div>
              {matches.length > 0 && <ul className="mt-2 divide-y divide-[var(--border)]/60 overflow-hidden rounded-xl border border-[var(--border)]">{matches.map((m) => <li key={m.id}><button onClick={() => { setPatient(m); setMatches([]); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--primary-tint)]/10"><b>{m.first_name} {m.last_name}</b> <span className="text-[var(--primary)]">{m.mrn}</span></button></li>)}</ul>}
            </>
          )}
        </div>

        {!doctorOnly && (
          <Field label="Doctor">{(p) => <select {...p} value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls}><option value="">Select doctor…</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.user.name}{d.specialization ? ` — ${d.specialization}` : ""}</option>)}</select>}</Field>
        )}

        {!override && (doctorOnly || doctorId) && (
          !slots ? <p className="text-sm text-[var(--muted)]">Loading free times…</p> : keys.length === 0 ? (
            <Notice kind="warn">No free times in the next 4 weeks{canOverride ? ". You can still book outside the schedule below." : ". Choose another doctor."}</Notice>
          ) : (
            <div className="space-y-3">
              <div role="radiogroup" aria-label="Date" className="flex gap-2 overflow-x-auto pb-1">
                {keys.map((k) => { const d = wallDate(k); return (
                  <button key={k} type="button" role="radio" aria-checked={k === day} onClick={() => { setDay(k); setTime(""); }} className={`w-16 flex-none rounded-2xl border px-2 py-2 text-center ${k === day ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white"}`}>
                    <span className="block text-[11px] opacity-80">{d.toLocaleDateString(undefined, { weekday: "short" })}</span><span className="font-heading text-lg font-semibold">{d.getDate()}</span><span className="block text-[11px] opacity-80">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                  </button>); })}
              </div>
              <div role="radiogroup" aria-label="Time" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {(slots.days[day] ?? []).map((t) => <button key={t} type="button" role="radio" aria-checked={t === time} onClick={() => setTime(t)} className={`rounded-xl border px-2 py-2 text-sm tabular-nums ${t === time ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:border-[var(--primary)]"}`}>{t}</button>)}
              </div>
              {start && <p className="text-sm">Selected: <b>{fmtDateTime(start.replace(" ", "T") + ":00")}</b> ({slots.slot_minutes} min)</p>}
            </div>
          )
        )}

        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1.5 text-xs font-semibold">Visit type</legend>
          {([["in_person", "In person", slots?.accepts_in_person !== false], ["online", "Video visit", slots?.accepts_online !== false]] as const).map(([v, label, ok]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm ${visitType === v ? "border-[var(--primary)] bg-[var(--primary-tint)]/20" : "border-[var(--border)]"} ${ok ? "" : "opacity-50"}`}>
              <input type="radio" name="vt" disabled={!ok} checked={visitType === v} onChange={() => setVisitType(v)} />{label}{!ok && <span className="text-xs text-[var(--muted)]">(not offered)</span>}
            </label>
          ))}
        </fieldset>

        <Field label="Reason">{(p) => <input {...p} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Routine check-up" className={inputCls} />}</Field>

        {canOverride && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-3">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />Book outside the doctor&apos;s schedule (exception)</label>
            {override && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Date & time" hint="Still cannot overlap another appointment.">{(p) => <input {...p} type="datetime-local" step={300} value={freeWhen} onChange={(e) => setFreeWhen(e.target.value)} className={inputCls} />}</Field>
                <Field label="Reason for the exception" hint="Recorded in the audit log.">{(p) => <input {...p} value={overrideReason} maxLength={300} onChange={(e) => setOverrideReason(e.target.value)} className={inputCls} />}</Field>
              </div>
            )}
          </div>
        )}
        {error && <Notice kind="error">{error}</Notice>}
      </div>
    </Modal>
  );
}
