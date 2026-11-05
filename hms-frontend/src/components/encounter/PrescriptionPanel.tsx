"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";
import { Field, Notice, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import type { RxItem } from "@/components/encounter/types";

const FREQ = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "Every 8 hours", "Every 12 hours", "At night", "As needed"];

export default function PrescriptionPanel({ visitId, prescriptionId, items, locked, onChanged }: {
  visitId: string; prescriptionId: string | null; items: RxItem[]; locked: boolean; onChanged: () => void;
}) {
  const empty = { medicine_name: "", dosage: "", frequency: "Twice daily", duration_days: "", instructions: "" };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [warn, setWarn] = useState<string[]>([]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setWarn([]);
    try {
      const { data } = await api.post(`/visits/${visitId}/prescriptions`, {
        items: [{ ...f, duration_days: f.duration_days ? Number(f.duration_days) : null, instructions: f.instructions || null }],
      });
      setWarn(data.allergy_warnings ?? []);
      setF(empty);
      onChanged();
    } catch (e2) { setErr(apiError(e2)); } finally { setBusy(false); }
  }

  async function remove(i: RxItem) {
    if (!confirm(`Remove ${i.medicine_name}?`)) return;
    try { await api.delete(`/visits/${visitId}/prescription-items/${i.id}`); onChanged(); } catch (e) { setErr(apiError(e)); }
  }

  return (
    <div>
      {warn.map((w) => <div key={w} className="mb-3"><Notice kind="warn"><b>Allergy check:</b> {w} Review before the patient leaves.</Notice></div>)}
      {items.length > 0 && (
        <ul className="mb-4 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <span><b>{i.medicine_name}</b> · {i.dosage}, {i.frequency}{i.duration_days ? ` · ${i.duration_days} days` : ""}{i.instructions && <span className="block text-xs text-[var(--muted)]">{i.instructions}</span>}</span>
              {!locked && <button onClick={() => remove(i)} className={`${btnDanger} !px-3 !py-1 text-xs`} aria-label={`Remove ${i.medicine_name}`}>Remove</button>}
            </li>
          ))}
        </ul>
      )}
      {prescriptionId && <Link href={`/doctor/prescriptions/${prescriptionId}`} target="_blank" className={`${btnGhost} mb-4`}>Print / save prescription as PDF</Link>}

      {!locked && (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-6">
          <Field label="Medicine" className="sm:col-span-3">{(p) => <input {...p} required maxLength={150} value={f.medicine_name} onChange={(e) => setF({ ...f, medicine_name: e.target.value })} className={inputCls} />}</Field>
          <Field label="Dose" className="sm:col-span-3">{(p) => <input {...p} required maxLength={50} placeholder="e.g. 500 mg" value={f.dosage} onChange={(e) => setF({ ...f, dosage: e.target.value })} className={inputCls} />}</Field>
          <Field label="Frequency" className="sm:col-span-2">{(p) => <select {...p} value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })} className={inputCls}>{FREQ.map((x) => <option key={x}>{x}</option>)}</select>}</Field>
          <Field label="Days" className="sm:col-span-1">{(p) => <input {...p} type="number" min="1" max="365" value={f.duration_days} onChange={(e) => setF({ ...f, duration_days: e.target.value })} className={inputCls} />}</Field>
          <Field label="Instructions" className="sm:col-span-3">{(p) => <input {...p} maxLength={500} placeholder="e.g. after meals" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} className={inputCls} />}</Field>
          <div className="sm:col-span-6 flex items-center gap-3"><button disabled={busy} className={btnPrimary}>{busy ? "Adding…" : "Add medicine"}</button>{err && <span role="alert" className="text-sm text-red-700">{err}</span>}</div>
        </form>
      )}
      {locked && items.length === 0 && <p className="text-sm text-[var(--muted)]">No medicines prescribed.</p>}
    </div>
  );
}
