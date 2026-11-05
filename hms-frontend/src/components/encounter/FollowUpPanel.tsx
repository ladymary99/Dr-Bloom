"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { addDays, apiError, fmtDateTime, todayStr, wallDate } from "@/lib/format";
import { Field, Notice, btnGhost, inputCls } from "@/components/ui";
import type { Form } from "@/components/encounter/types";

/** Follow-up advice (days + note) and, optionally, an actual booking made when the visit is completed. */
export default function FollowUpPanel({ form, onChange, slot, onSlot, disabled }: {
  form: Form; onChange: (p: Partial<Form>) => void; slot: string; onSlot: (s: string) => void; disabled?: boolean;
}) {
  const [days, setDays] = useState<Record<string, string[]> | null>(null);
  const [day, setDay] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true); setErr("");
    try {
      const { data } = await api.get("/doctor/slots", { params: { from: addDays(todayStr(), form.follow_up_days ? Math.max(Number(form.follow_up_days) - 3, 0) : 1), to: addDays(todayStr(), (Number(form.follow_up_days) || 14) + 14) } });
      setDays(data.days); setDay(Object.keys(data.days)[0] ?? "");
    } catch (e) { setErr(apiError(e)); } finally { setLoading(false); }
  }

  const keys = Object.keys(days ?? {});
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Field label="Review in (days)">{(p) => <input {...p} type="number" min="1" max="730" disabled={disabled} value={form.follow_up_days} onChange={(e) => onChange({ follow_up_days: e.target.value })} className={inputCls} />}</Field>
        <Field label="Follow-up note">{(p) => <input {...p} maxLength={300} disabled={disabled} placeholder="e.g. bring blood pressure diary" value={form.follow_up_note} onChange={(e) => onChange({ follow_up_note: e.target.value })} className={inputCls} />}</Field>
      </div>
      {!disabled && (
        <div>
          {slot ? (
            <p className="flex flex-wrap items-center gap-3 text-sm"><span>Will book: <b>{fmtDateTime(slot.replace(" ", "T") + ":00")}</b></span><button type="button" onClick={() => onSlot("")} className={btnGhost}>Remove</button></p>
          ) : (
            <button type="button" onClick={load} disabled={loading} className={btnGhost}>{loading ? "Loading times…" : "Book a follow-up appointment now"}</button>
          )}
          {err && <div className="mt-2"><Notice kind="error">{err}</Notice></div>}
          {days && !slot && (keys.length === 0 ? <p className="mt-2 text-sm text-[var(--muted)]">No free times in that window.</p> : (
            <div className="mt-3 space-y-3">
              <div role="radiogroup" aria-label="Follow-up date" className="flex gap-2 overflow-x-auto pb-1">
                {keys.map((k) => { const d = wallDate(k); return (
                  <button key={k} type="button" role="radio" aria-checked={k === day} onClick={() => setDay(k)} className={`w-16 flex-none rounded-2xl border px-2 py-2 text-center ${k === day ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white"}`}>
                    <span className="block text-[11px] opacity-80">{d.toLocaleDateString(undefined, { weekday: "short" })}</span><span className="font-heading text-lg font-semibold">{d.getDate()}</span><span className="block text-[11px] opacity-80">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                  </button>); })}
              </div>
              <div role="radiogroup" aria-label="Follow-up time" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {(days[day] ?? []).map((t) => <button key={t} type="button" role="radio" aria-checked={false} onClick={() => onSlot(`${day} ${t}`)} className="rounded-xl border border-[var(--border)] bg-white px-2 py-2 text-sm tabular-nums hover:border-[var(--primary)]">{t}</button>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
