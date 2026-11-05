"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDate, todayStr } from "@/lib/format";
import { Field, Modal, Notice, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import type { Letter } from "@/components/encounter/types";

export default function LettersPanel({ visitId, letters, onChanged }: { visitId: string; letters: Letter[]; onChanged: () => void }) {
  const [open, setOpen] = useState<null | "sick_note" | "referral">(null);
  const [sick, setSick] = useState({ from_date: todayStr(), to_date: todayStr(), note: "", show_diagnosis: false });
  const [ref, setRef] = useState({ to_specialty: "", to_doctor: "", urgency: "routine", reason: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function issue() {
    setBusy(true); setErr("");
    try {
      const data = open === "sick_note" ? { ...sick, note: sick.note || undefined } : { ...ref, to_doctor: ref.to_doctor || undefined };
      await api.post(`/visits/${visitId}/letters`, { type: open, data });
      setOpen(null); onChanged();
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  }

  return (
    <div>
      {letters.length > 0 && (
        <ul className="mb-4 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] text-sm">
          {letters.map((l) => (
            <li key={l.id} className="flex items-center justify-between px-4 py-3">
              <span><b>{l.type === "sick_note" ? "Sick note" : "Referral letter"}</b> · {fmtShortDate(l.issued_at)}</span>
              <Link href={`/doctor/letters/${l.id}`} target="_blank" className="text-xs font-semibold text-[var(--primary)] underline-offset-2 hover:underline">Print / PDF</Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setErr(""); setOpen("sick_note"); }} className={btnGhost}>+ Sick note</button>
        <button onClick={() => { setErr(""); setOpen("referral"); }} className={btnGhost}>+ Referral letter</button>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open === "sick_note" ? "Issue a sick note" : "Issue a referral letter"}
        footer={<><button onClick={() => setOpen(null)} className={btnGhost}>Cancel</button><button onClick={issue} disabled={busy || (open === "referral" && (!ref.to_specialty || !ref.reason))} className={btnPrimary}>{busy ? "Issuing…" : "Issue"}</button></>}>
        {open === "sick_note" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Unfit for work from">{(p) => <input {...p} type="date" value={sick.from_date} onChange={(e) => setSick({ ...sick, from_date: e.target.value, to_date: e.target.value > sick.to_date ? e.target.value : sick.to_date })} className={inputCls} />}</Field>
              <Field label="Until (inclusive)">{(p) => <input {...p} type="date" min={sick.from_date} value={sick.to_date} onChange={(e) => setSick({ ...sick, to_date: e.target.value })} className={inputCls} />}</Field>
            </div>
            <Field label="Note (optional)">{(p) => <textarea {...p} rows={2} maxLength={500} value={sick.note} onChange={(e) => setSick({ ...sick, note: e.target.value })} className={inputCls} />}</Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sick.show_diagnosis} onChange={(e) => setSick({ ...sick, show_diagnosis: e.target.checked })} />Show the diagnosis on the note (leave off to protect privacy)</label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Refer to (specialty)">{(p) => <input {...p} required maxLength={120} value={ref.to_specialty} onChange={(e) => setRef({ ...ref, to_specialty: e.target.value })} className={inputCls} />}</Field>
              <Field label="Doctor (optional)">{(p) => <input {...p} maxLength={120} value={ref.to_doctor} onChange={(e) => setRef({ ...ref, to_doctor: e.target.value })} className={inputCls} />}</Field>
            </div>
            <Field label="Urgency">{(p) => <select {...p} value={ref.urgency} onChange={(e) => setRef({ ...ref, urgency: e.target.value })} className={inputCls}><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select>}</Field>
            <Field label="Reason and relevant history">{(p) => <textarea {...p} rows={5} required maxLength={2000} value={ref.reason} onChange={(e) => setRef({ ...ref, reason: e.target.value })} className={inputCls} />}</Field>
          </div>
        )}
        {err && <div className="mt-3"><Notice kind="error">{err}</Notice></div>}
      </Modal>
    </div>
  );
}
