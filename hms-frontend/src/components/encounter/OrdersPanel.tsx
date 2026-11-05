"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDateTime } from "@/lib/format";
import { Field, Notice, StatusBadge, btnGhost, btnPrimary, inputCls } from "@/components/ui";
import type { Lab } from "@/components/encounter/types";

export default function OrdersPanel({ visitId, patientId, labs, locked, onChanged }: { visitId: string; patientId: string; labs: Lab[]; locked: boolean; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"lab" | "imaging">("lab");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function order(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await api.post("/lab-tests", { patient_id: patientId, visit_id: visitId, test_name: name.trim(), category }); setName(""); onChanged(); }
    catch (e2) { setErr(apiError(e2)); } finally { setBusy(false); }
  }
  async function review(l: Lab) {
    try { await api.post(`/lab-tests/${l.id}/review`); onChanged(); } catch (e) { setErr(apiError(e)); }
  }

  return (
    <div>
      {labs.length > 0 ? (
        <ul className="mb-4 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
          {labs.map((l) => (
            <li key={l.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2"><b>{l.test_name}</b>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">{l.category === "imaging" ? "Imaging" : "Lab"}</span>
                  <StatusBadge status={l.status} />
                  {l.is_critical && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">CRITICAL</span>}
                </span>
                {l.status === "completed" && !l.reviewed_at && <button onClick={() => review(l)} className={`${btnGhost} !px-3 !py-1 text-xs`}>Mark reviewed</button>}
                {l.reviewed_at && <span className="text-xs text-[var(--muted)]">reviewed {fmtShortDateTime(l.reviewed_at)}</span>}
              </div>
              {l.result && <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-2 font-sans text-xs">{l.result}</pre>}
            </li>
          ))}
        </ul>
      ) : <p className="mb-3 text-sm text-[var(--muted)]">No tests ordered in this visit.</p>}
      {labs.some((l) => l.status === "completed") && <p className="mb-3 text-xs text-[var(--muted)]">Results go to the patient only after you or the lab release them (see <Link href={`/patients/${patientId}`} className="underline">chart</Link>).</p>}

      {!locked && (
        <form onSubmit={order} className="grid gap-3 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
          <Field label="Type">{(p) => <select {...p} value={category} onChange={(e) => setCategory(e.target.value as "lab" | "imaging")} className={inputCls}><option value="lab">Laboratory</option><option value="imaging">Imaging</option></select>}</Field>
          <Field label="Test">{(p) => <input {...p} required maxLength={150} placeholder={category === "imaging" ? "e.g. Chest X-ray" : "e.g. CBC, HbA1c"} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />}</Field>
          <button disabled={busy || !name.trim()} className={btnPrimary}>{busy ? "Ordering…" : "Order"}</button>
        </form>
      )}
      {err && <div className="mt-3"><Notice kind="error">{err}</Notice></div>}
    </div>
  );
}
