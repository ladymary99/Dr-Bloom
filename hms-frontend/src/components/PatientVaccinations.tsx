"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { Field, Notice, btnPrimary, inputCls } from "@/components/ui";

type Vax = { id: string; vaccine_name: string; dose_number: number | null; administered_on: string; next_due_on: string | null; lot_number: string | null; administrator?: { name: string } | null };

/** Vaccination history on a patient record. Doctors record; everyone with patient access can read. */
export default function PatientVaccinations({ patientId }: { patientId: string }) {
  const canWrite = useAuthStore((s) => s.hasPermission("conduct visits"));
  const [rows, setRows] = useState<Vax[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ vaccine_name: "", dose_number: "", administered_on: new Date().toLocaleDateString("en-CA"), next_due_on: "", lot_number: "" });

  const load = useCallback(async () => {
    try { setRows((await api.get<Vax[]>(`/patients/${patientId}/vaccinations`)).data); } catch (e) { setErr(apiError(e)); }
  }, [patientId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      await api.post(`/patients/${patientId}/vaccinations`, { ...f, dose_number: f.dose_number ? Number(f.dose_number) : undefined, next_due_on: f.next_due_on || undefined, lot_number: f.lot_number || undefined });
      setF({ ...f, vaccine_name: "", dose_number: "", next_due_on: "", lot_number: "" });
      await load();
    } catch (e2) { setErr(apiError(e2)); } finally { setBusy(false); }
  }
  async function remove(v: Vax) {
    if (!confirm(`Remove ${v.vaccine_name} from this record?`)) return;
    try { await api.delete(`/patients/${patientId}/vaccinations/${v.id}`); await load(); } catch (e) { setErr(apiError(e)); }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] p-4" aria-label="Vaccinations">
      <h3 className="mb-3 font-heading text-sm font-semibold text-[var(--ink)]">Vaccinations</h3>
      {err && <div className="mb-3"><Notice kind="error">{err}</Notice></div>}
      {rows.length === 0 ? <p className="text-sm text-[var(--muted)]">None recorded.</p> : (
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 py-2">
              <span><strong>{v.vaccine_name}</strong>{v.dose_number ? ` · dose ${v.dose_number}` : ""} · {fmtShortDate(v.administered_on + "T00:00:00")}{v.next_due_on ? ` · next ${fmtShortDate(v.next_due_on + "T00:00:00")}` : ""}</span>
              {canWrite && <button onClick={() => remove(v)} className="text-xs font-medium text-red-700 hover:underline" aria-label={`Remove ${v.vaccine_name}`}>Remove</button>}
            </li>
          ))}
        </ul>
      )}
      {canWrite && (
        <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-[1fr_5rem_9rem_9rem_auto] sm:items-end">
          <Field label="Vaccine">{(p) => <input {...p} required value={f.vaccine_name} onChange={(e) => setF({ ...f, vaccine_name: e.target.value })} className={inputCls} />}</Field>
          <Field label="Dose">{(p) => <input {...p} type="number" min="1" max="10" value={f.dose_number} onChange={(e) => setF({ ...f, dose_number: e.target.value })} className={inputCls} />}</Field>
          <Field label="Given on">{(p) => <input {...p} type="date" required max={new Date().toLocaleDateString("en-CA")} value={f.administered_on} onChange={(e) => setF({ ...f, administered_on: e.target.value })} className={inputCls} />}</Field>
          <Field label="Next due">{(p) => <input {...p} type="date" min={f.administered_on} value={f.next_due_on} onChange={(e) => setF({ ...f, next_due_on: e.target.value })} className={inputCls} />}</Field>
          <button disabled={busy} className={btnPrimary}>Add</button>
        </form>
      )}
    </section>
  );
}
