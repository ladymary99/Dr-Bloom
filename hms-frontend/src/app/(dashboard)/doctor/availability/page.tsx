"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDate, fmtShortDateTime, money, todayStr, wallDate } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
import { ErrorState, Field, ListSkeleton, Notice, PageHeader, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Off = { id: number; starts_on: string; ends_on: string; reason: string | null };
type DayCfg = { start: string; end: string; breaks: [string, string][] };
type Av = {
  weekly_schedule: Record<string, DayCfg>; slot_minutes: number; buffer_minutes: number; max_per_day: number | null;
  accepts_online: boolean; accepts_in_person: boolean; bio: string | null; languages: string | null; years_experience: number | null;
  consultation_fee: string | null; license_number: string | null; time_off: Off[];
};
type Conflict = { id: string; appointment_at: string; patient: string; reason: string };
type Day = { on: boolean; start: string; end: string; breaks: [string, string][] };

const DAYS: [string, string][] = [["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"], ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"], ["7", "Sunday"]];
const blank = (): Day => ({ on: false, start: "09:00", end: "17:00", breaks: [] });

export default function AvailabilityPage() {
  const { data, error, reload } = useFetch<Av>("/doctor/availability");
  const [week, setWeek] = useState<Record<string, Day>>({});
  const [slot, setSlot] = useState("30");
  const [buffer, setBuffer] = useState("0");
  const [maxPerDay, setMaxPerDay] = useState("");
  const [online, setOnline] = useState(true);
  const [inPerson, setInPerson] = useState(true);
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [years, setYears] = useState("");
  const [fee, setFee] = useState("");
  const [license, setLicense] = useState("");
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "warn"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ days: Record<string, string[]>; conflicts: Conflict[] } | null>(null);
  const [off, setOff] = useState({ starts_on: todayStr(), ends_on: todayStr(), reason: "" });

  useEffect(() => {
    if (!data) return;
    const w: Record<string, Day> = {};
    DAYS.forEach(([k]) => { const c = data.weekly_schedule[k]; w[k] = c ? { on: true, start: c.start, end: c.end, breaks: c.breaks } : blank(); });
    /* eslint-disable react-hooks/set-state-in-effect */
    setWeek(w); setSlot(String(data.slot_minutes)); setBuffer(String(data.buffer_minutes ?? 0)); setMaxPerDay(data.max_per_day ? String(data.max_per_day) : "");
    setOnline(data.accepts_online); setInPerson(data.accepts_in_person); setBio(data.bio ?? ""); setLanguages(data.languages ?? "");
    setYears(data.years_experience?.toString() ?? ""); setFee(data.consultation_fee ?? ""); setLicense(data.license_number ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data]);

  const setDay = (k: string, patch: Partial<Day>) => { setWeek((w) => ({ ...w, [k]: { ...w[k], ...patch } })); setPreview(null); };
  const payload = () => ({
    weekly_schedule: Object.fromEntries(Object.entries(week).filter(([, d]) => d.on).map(([k, d]) => [k, { start: d.start, end: d.end, breaks: d.breaks.filter((b) => b[0] && b[1]) }])),
    slot_minutes: Number(slot), buffer_minutes: Number(buffer) || 0, max_per_day: maxPerDay ? Number(maxPerDay) : null,
    accepts_online: online, accepts_in_person: inPerson, bio: bio || null, languages: languages || null,
    years_experience: years ? Number(years) : null, consultation_fee: fee ? Number(fee) : null, license_number: license || null,
  });

  function copyToAll(from: string) {
    const src = week[from];
    setWeek((w) => Object.fromEntries(Object.entries(w).map(([k, d]) => [k, d.on ? { ...d, start: src.start, end: src.end, breaks: src.breaks.map((b) => [...b] as [string, string]) } : d])));
    setPreview(null);
  }

  async function runPreview() {
    setBusy(true); setMsg(null);
    try { const { data: res } = await api.post("/doctor/availability/preview", payload()); setPreview(res); }
    catch (e) { setMsg({ kind: "error", text: apiError(e) }); } finally { setBusy(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const { data: res } = await api.put("/doctor/availability", payload());
      setMsg((res.conflicts?.length ?? 0) > 0
        ? { kind: "warn", text: `Saved. ${res.conflicts.length} existing booking(s) fall outside the new schedule. They were kept; see the list below and move them from Appointments.` }
        : { kind: "success", text: "Saved. Patients now see free slots based on this schedule." });
      setPreview(res.conflicts?.length ? { days: preview?.days ?? {}, conflicts: res.conflicts } : null);
      reload();
    } catch (err) { setMsg({ kind: "error", text: apiError(err) }); } finally { setBusy(false); }
  }

  async function addOff(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const { data: res } = await api.post("/doctor/time-off", { ...off, reason: off.reason || undefined });
      setMsg(res.affected_appointments > 0 ? { kind: "warn", text: `Day off added. ${res.affected_appointments} booked appointment(s) fall in this period: reschedule or cancel them from Appointments.` } : { kind: "success", text: "Day off added. No slots will be offered on those dates." });
      setOff({ starts_on: todayStr(), ends_on: todayStr(), reason: "" }); reload();
    } catch (err) { setMsg({ kind: "error", text: apiError(err) }); } finally { setBusy(false); }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ListSkeleton rows={3} />;
  const anyDay = Object.values(week).some((d) => d.on);

  return (
    <div className="animate-fade-up max-w-4xl space-y-5">
      <PageHeader title="My schedule" subtitle="Set when patients can book you. Existing bookings are never removed by a change." />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <form onSubmit={save} className="space-y-5">
        <fieldset className={`${cardCls} p-6`}>
          <legend className="sr-only">Weekly hours</legend>
          <h2 className="mb-1 font-heading text-base font-semibold">Weekly hours</h2>
          <p className="mb-4 text-xs text-[var(--muted)]">Each day can have its own hours and breaks. Days that are switched off are days off.</p>
          <ul className="space-y-3">
            {DAYS.map(([k, name]) => {
              const d = week[k] ?? blank();
              return (
                <li key={k} className={`rounded-2xl border p-3 ${d.on ? "border-[var(--border)] bg-white" : "border-transparent bg-slate-50"}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex w-36 cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4" checked={d.on} onChange={(e) => setDay(k, { on: e.target.checked })} />{name}</label>
                    {d.on ? (
                      <>
                        <label className="sr-only" htmlFor={`s${k}`}>{name} start</label><input id={`s${k}`} type="time" value={d.start} onChange={(e) => setDay(k, { start: e.target.value })} className={`${inputCls} !w-32`} />
                        <span aria-hidden>–</span>
                        <label className="sr-only" htmlFor={`e${k}`}>{name} end</label><input id={`e${k}`} type="time" value={d.end} onChange={(e) => setDay(k, { end: e.target.value })} className={`${inputCls} !w-32`} />
                        <button type="button" onClick={() => setDay(k, { breaks: [...d.breaks, ["13:00", "14:00"]] })} className="text-xs font-semibold text-[var(--primary)] hover:underline">+ break</button>
                        <button type="button" onClick={() => copyToAll(k)} className="ml-auto text-xs font-medium text-[var(--muted)] hover:underline">Copy to other working days</button>
                      </>
                    ) : <span className="text-sm text-[var(--muted)]">Day off</span>}
                  </div>
                  {d.on && d.breaks.map((b, i) => (
                    <div key={i} className="mt-2 flex items-center gap-2 pl-0 sm:pl-40">
                      <span className="text-xs text-[var(--muted)]">Break</span>
                      <input aria-label={`${name} break ${i + 1} start`} type="time" value={b[0]} onChange={(e) => setDay(k, { breaks: d.breaks.map((x, n) => (n === i ? [e.target.value, x[1]] : x)) })} className={`${inputCls} !w-28 !py-1.5`} />
                      <span aria-hidden>–</span>
                      <input aria-label={`${name} break ${i + 1} end`} type="time" value={b[1]} onChange={(e) => setDay(k, { breaks: d.breaks.map((x, n) => (n === i ? [x[0], e.target.value] : x)) })} className={`${inputCls} !w-28 !py-1.5`} />
                      <button type="button" aria-label={`Remove break ${i + 1} on ${name}`} onClick={() => setDay(k, { breaks: d.breaks.filter((_, n) => n !== i) })} className="h-8 w-8 rounded-full text-red-700 hover:bg-red-50">×</button>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        </fieldset>

        <fieldset className={`${cardCls} p-6`}>
          <legend className="sr-only">Visit rules</legend>
          <h2 className="mb-3 font-heading text-base font-semibold">Visit rules</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Visit length">{(p) => <select {...p} value={slot} onChange={(e) => { setSlot(e.target.value); setPreview(null); }} className={inputCls}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select>}</Field>
            <Field label="Buffer after each visit" hint="Free time kept after every booking.">{(p) => <select {...p} value={buffer} onChange={(e) => { setBuffer(e.target.value); setPreview(null); }} className={inputCls}>{[0, 5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m === 0 ? "None" : `${m} minutes`}</option>)}</select>}</Field>
            <Field label="Max patients per day" hint="Leave empty for no limit.">{(p) => <input {...p} type="number" min="1" max="100" value={maxPerDay} onChange={(e) => { setMaxPerDay(e.target.value); setPreview(null); }} className={inputCls} />}</Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={inPerson} onChange={(e) => setInPerson(e.target.checked)} />Accept in-person visits</label>
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={online} onChange={(e) => setOnline(e.target.checked)} />Accept video visits</label>
          </div>
        </fieldset>

        <section className={`${cardCls} p-6`} aria-label="Slot preview">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-heading text-base font-semibold">Preview</h2><p className="text-xs text-[var(--muted)]">Exactly what patients would see for the next 14 days with these settings (before you save).</p></div>
            <button type="button" onClick={runPreview} disabled={busy || !anyDay} className={btnGhost}>{busy ? "Checking…" : "Preview slots"}</button>
          </div>
          {preview && (
            <div className="mt-4 space-y-4">
              {Object.keys(preview.days).length === 0 ? <p className="text-sm text-[var(--muted)]">No bookable slots in the next 14 days with these settings.</p> : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(preview.days).map(([date, times]) => (
                    <li key={date} className="rounded-2xl bg-slate-50 p-3 text-xs"><p className="mb-1 font-semibold text-[var(--ink)]">{wallDate(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })} <span className="font-normal text-[var(--muted)]">· {times.length} slots</span></p><p className="leading-relaxed tabular-nums text-[var(--muted)]">{times.join("  ")}</p></li>
                  ))}
                </ul>
              )}
              {preview.conflicts.length > 0 && (
                <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">{preview.conflicts.length} existing booking(s) would fall outside this schedule:</p>
                  <ul className="mt-2 space-y-0.5">{preview.conflicts.map((c) => <li key={c.id}>{fmtShortDateTime(c.appointment_at)} · {c.patient}{c.reason ? ` · ${c.reason}` : ""}</li>)}</ul>
                  <p className="mt-2 text-xs">They are kept if you save. Move or cancel them from Appointments.</p>
                </div>
              )}
            </div>
          )}
        </section>

        <fieldset className={`${cardCls} p-6`}>
          <legend className="sr-only">Public profile</legend>
          <h2 className="mb-3 font-heading text-base font-semibold">Public profile (shown to patients)</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Years of experience">{(p) => <input {...p} type="number" min="0" max="70" value={years} onChange={(e) => setYears(e.target.value)} className={inputCls} />}</Field>
            <Field label="Consultation fee" hint={fee ? money(fee) : "Empty = clinic default"}>{(p) => <input {...p} type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} />}</Field>
            <Field label="Languages" hint="Comma separated">{(p) => <input {...p} value={languages} placeholder="English, Azərbaycanca" onChange={(e) => setLanguages(e.target.value)} className={inputCls} />}</Field>
            <Field label="Licence number" hint="Printed on prescriptions">{(p) => <input {...p} maxLength={60} value={license} onChange={(e) => setLicense(e.target.value)} className={inputCls} />}</Field>
          </div>
          <Field label="Biography" className="mt-4">{(p) => <textarea {...p} rows={4} maxLength={1500} value={bio} onChange={(e) => setBio(e.target.value)} className={inputCls} />}</Field>
        </fieldset>
        <div className="flex justify-end"><button disabled={busy || !anyDay} className={btnPrimary}>{busy ? "Saving…" : "Save schedule"}</button></div>
      </form>

      <section className={`${cardCls} p-6`} aria-label="Days off">
        <h2 className="mb-1 font-heading text-base font-semibold">Days off & leave</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">No slots are offered on these dates.</p>
        <form onSubmit={addOff} className="mb-4 grid gap-3 sm:grid-cols-[9rem_9rem_1fr_auto] sm:items-end">
          <Field label="From">{(p) => <input {...p} type="date" required min={todayStr()} value={off.starts_on} onChange={(e) => setOff({ ...off, starts_on: e.target.value, ends_on: e.target.value > off.ends_on ? e.target.value : off.ends_on })} className={inputCls} />}</Field>
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
