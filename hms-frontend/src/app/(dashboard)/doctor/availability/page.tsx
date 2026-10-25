"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDate, money } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
import { ErrorState, Field, ListSkeleton, Notice, PageHeader, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Off = { id: number; starts_on: string; ends_on: string; reason: string | null };
type Av = {
  working_days: number[]; working_hours: { start: string; end: string; break_start?: string | null; break_end?: string | null };
  slot_minutes: number; bio: string | null; languages: string | null; years_experience: number | null; consultation_fee: string | null; time_off: Off[];
};

const DAYS: [number, string][] = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [7, "Sun"]];
const today = () => new Date().toLocaleDateString("en-CA");

export default function AvailabilityPage() {
  const { data, error, reload } = useFetch<Av>("/doctor/availability");
  const [days, setDays] = useState<number[]>([]);
  const [h, setH] = useState({ start: "09:00", end: "17:00", break_start: "", break_end: "" });
  const [slot, setSlot] = useState("30");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [years, setYears] = useState("");
  const [fee, setFee] = useState("");
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "warn"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState({ starts_on: today(), ends_on: today(), reason: "" });

  useEffect(() => {
    if (!data) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setDays(data.working_days);
    setH({ start: data.working_hours.start, end: data.working_hours.end, break_start: data.working_hours.break_start ?? "", break_end: data.working_hours.break_end ?? "" });
    setSlot(String(data.slot_minutes)); setBio(data.bio ?? ""); setLanguages(data.languages ?? "");
    setYears(data.years_experience?.toString() ?? ""); setFee(data.consultation_fee ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const { data: res } = await api.put("/doctor/availability", {
        working_days: days,
        working_hours: { start: h.start, end: h.end, break_start: h.break_start || null, break_end: h.break_end || null },
        slot_minutes: Number(slot), bio: bio || null, languages: languages || null,
        years_experience: years ? Number(years) : null, consultation_fee: fee ? Number(fee) : null,
      });
      setMsg(res.outside_hours_appointments > 0
        ? { kind: "warn", text: `Saved. ${res.outside_hours_appointments} existing future appointment(s) fall outside the new hours; they were kept, please review them in Appointments.` }
        : { kind: "success", text: "Saved. Patients now see free slots based on these hours." });
      reload();
    } catch (err) { setMsg({ kind: "error", text: apiError(err) }); } finally { setBusy(false); }
  }

  async function addOff(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const { data: res } = await api.post("/doctor/time-off", { ...off, reason: off.reason || undefined });
      setMsg(res.affected_appointments > 0
        ? { kind: "warn", text: `Day off added. ${res.affected_appointments} booked appointment(s) fall in this period; reschedule or cancel them from Appointments.` }
        : { kind: "success", text: "Day off added. No slots will be offered on those dates." });
      setOff({ starts_on: today(), ends_on: today(), reason: "" }); reload();
    } catch (err) { setMsg({ kind: "error", text: apiError(err) }); } finally { setBusy(false); }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ListSkeleton rows={3} />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="My schedule" subtitle="Set when patients can book you online. Existing bookings are never removed by a change." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <form onSubmit={save} className="space-y-5">
        <fieldset className={`${cardCls} p-6`}>
          <legend className="sr-only">Working days and hours</legend>
          <h2 className="mb-3 font-heading text-base font-semibold">Working days & hours</h2>
          <div role="group" aria-label="Working days" className="mb-4 flex flex-wrap gap-2">
            {DAYS.map(([n, label]) => (
              <button type="button" key={n} aria-pressed={days.includes(n)} onClick={() => setDays((d) => d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort())}
                className={`w-14 rounded-xl border px-2 py-2 text-sm font-semibold transition ${days.includes(n) ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--primary)]"}`}>{label}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Start">{(p) => <input {...p} type="time" required value={h.start} onChange={(e) => setH({ ...h, start: e.target.value })} className={inputCls} />}</Field>
            <Field label="End">{(p) => <input {...p} type="time" required value={h.end} onChange={(e) => setH({ ...h, end: e.target.value })} className={inputCls} />}</Field>
            <Field label="Break from">{(p) => <input {...p} type="time" value={h.break_start} onChange={(e) => setH({ ...h, break_start: e.target.value })} className={inputCls} />}</Field>
            <Field label="Break until">{(p) => <input {...p} type="time" value={h.break_end} onChange={(e) => setH({ ...h, break_end: e.target.value })} className={inputCls} />}</Field>
          </div>
          <Field label="Visit length" className="mt-4 max-w-xs" hint="Each bookable slot lasts this long.">{(p) => <select {...p} value={slot} onChange={(e) => setSlot(e.target.value)} className={inputCls}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select>}</Field>
        </fieldset>

        <fieldset className={`${cardCls} p-6`}>
          <legend className="sr-only">Public profile</legend>
          <h2 className="mb-3 font-heading text-base font-semibold">Public profile (shown to patients)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Years of experience">{(p) => <input {...p} type="number" min="0" max="70" value={years} onChange={(e) => setYears(e.target.value)} className={inputCls} />}</Field>
            <Field label="Consultation fee" hint={fee ? money(fee) : "Leave empty to use the clinic default"}>{(p) => <input {...p} type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} />}</Field>
            <Field label="Languages" hint="Comma separated">{(p) => <input {...p} value={languages} placeholder="English, Azərbaycanca, Русский" onChange={(e) => setLanguages(e.target.value)} className={inputCls} />}</Field>
          </div>
          <Field label="Biography" className="mt-4">{(p) => <textarea {...p} rows={4} maxLength={1500} value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls} />}</Field>
        </fieldset>
        <div className="flex justify-end"><button disabled={busy || days.length === 0} className={btnPrimary}>{busy ? "Saving…" : "Save schedule"}</button></div>
      </form>

      <section className={`${cardCls} p-6`} aria-label="Days off">
        <h2 className="mb-1 font-heading text-base font-semibold">Days off & leave</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">No slots are offered on these dates.</p>
        <form onSubmit={addOff} className="mb-4 grid gap-3 sm:grid-cols-[9rem_9rem_1fr_auto] sm:items-end">
          <Field label="From">{(p) => <input {...p} type="date" required min={today()} value={off.starts_on} onChange={(e) => setOff({ ...off, starts_on: e.target.value, ends_on: e.target.value > off.ends_on ? e.target.value : off.ends_on })} className={inputCls} />}</Field>
          <Field label="To">{(p) => <input {...p} type="date" required min={off.starts_on} value={off.ends_on} onChange={(e) => setOff({ ...off, ends_on: e.target.value })} className={inputCls} />}</Field>
          <Field label="Reason (optional)">{(p) => <input {...p} maxLength={160} value={off.reason} onChange={(e) => setOff({ ...off, reason: e.target.value })} className={inputCls} />}</Field>
          <button disabled={busy} className={btnGhost}>Add</button>
        </form>
        {data.time_off.length === 0 ? <p className="text-sm text-[var(--muted)]">No upcoming days off.</p> : (
          <ul className="divide-y divide-[var(--border)] text-sm">
            {data.time_off.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                <span><strong>{fmtShortDate(t.starts_on + "T00:00:00")}</strong>{t.ends_on !== t.starts_on && <> → <strong>{fmtShortDate(t.ends_on + "T00:00:00")}</strong></>}{t.reason && <span className="text-[var(--muted)]"> · {t.reason}</span>}</span>
                <button onClick={async () => { await api.delete(`/doctor/time-off/${t.id}`).catch(() => {}); reload(); }} className={`${btnDanger} !px-3 !py-1 text-xs`} aria-label={`Remove day off from ${t.starts_on}`}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
