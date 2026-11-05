"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNow } from "@/hooks/useNow";
import { apiError, fmtShortDate } from "@/lib/format";
import { EmptyState, Field, Modal, Notice, btnGhost, btnPrimary, inputCls } from "@/components/ui";

/** Emergency access to a patient outside your care: needs a written reason, lasts 4 hours, is reviewed by an administrator. */
export function BreakGlassForm({ patientId, onGranted }: { patientId: string; onGranted: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    try { await api.post(`/patients/${patientId}/break-glass`, { reason: reason.trim() }); onGranted(); }
    catch (e) { setErr(apiError(e)); setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <Notice kind="warn">You are not part of this patient&apos;s care team. You may still open the record in an emergency, but the access is <b>recorded, limited to 4 hours, and reviewed by an administrator</b>.</Notice>
      <Field label="Why do you need access?" hint={`At least 15 characters (${reason.trim().length}/15). Be specific: this is what the reviewer reads.`}>
        {(p) => <textarea {...p} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} data-autofocus />}
      </Field>
      {err && <Notice kind="error">{err}</Notice>}
      <button onClick={submit} disabled={busy || reason.trim().length < 15} className={btnPrimary}>{busy ? "Opening…" : "Open record (emergency access)"}</button>
    </div>
  );
}

type Hit = { id: string; mrn: string; first_name: string; last_name: string; date_of_birth: string | null; has_access: boolean };

export function PatientLookupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const now = useNow();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [err, setErr] = useState("");
  const [glass, setGlass] = useState<Hit | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results when the query becomes too short
    if (q.trim().length < 3) { setHits(null); return; }
    const t = setTimeout(async () => {
      try { setErr(""); setHits((await api.get<Hit[]>("/patient-lookup", { params: { q: q.trim() } })).data); }
      catch (e) { setErr(apiError(e)); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, open]);

  const close = () => { setQ(""); setHits(null); setGlass(null); onClose(); };
  const ageOf = (d: string | null) => (d ? `${Math.floor((now - new Date(d).getTime()) / 3.15576e10)} y` : "");

  return (
    <Modal open={open} onClose={close} title={glass ? `Emergency access: ${glass.first_name} ${glass.last_name}` : "Find any patient"} wide>
      {glass ? (
        <div className="space-y-3">
          <BreakGlassForm patientId={glass.id} onGranted={() => { const id = glass.id; close(); router.push(`/patients/${id}`); }} />
          <button onClick={() => setGlass(null)} className={btnGhost}>← Back to results</button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">Patients under your care open straight away. Anyone else needs emergency access with a reason, which an administrator reviews. Searches are logged.</p>
          <Field label="Name or MRN (at least 3 characters)">{(p) => <input {...p} value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} data-autofocus autoComplete="off" />}</Field>
          {err && <Notice kind="error">{err}</Notice>}
          {hits && (hits.length === 0 ? <EmptyState title="No patient found" hint="Check the spelling or try the MRN." /> : (
            <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
              {hits.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span><b>{h.first_name} {h.last_name}</b><span className="block text-xs text-[var(--muted)]">{h.mrn} · {h.date_of_birth ? `born ${fmtShortDate(h.date_of_birth + "T00:00:00")} (${ageOf(h.date_of_birth)})` : ""}</span></span>
                  {h.has_access ? <button onClick={() => { close(); router.push(`/patients/${h.id}`); }} className={btnPrimary}>Open chart</button>
                    : <button onClick={() => setGlass(h)} className={btnGhost}>Request emergency access…</button>}
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}
    </Modal>
  );
}
