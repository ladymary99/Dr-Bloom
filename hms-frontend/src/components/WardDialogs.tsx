"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";
import { Field, Modal, Notice, btnGhost, btnPrimary, inputCls } from "@/components/ui";

export type WardBed = { id: number; bed_number: string; status: string; cleaning_status?: string };
export type WardLite = { id: number; name: string; beds: WardBed[] };

/** Discharge always records a summary and the patient's condition (no more one-click confirm()). */
export function DischargeModal({ admissionId, patient, onClose, onDone }: { admissionId: number; patient: string; onClose: () => void; onDone: () => void }) {
  const [condition, setCondition] = useState("improved");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true); setErr("");
    try { await api.put(`/admissions/${admissionId}/discharge`, { discharge_summary: summary.trim(), discharge_condition: condition }); onDone(); }
    catch (e) { setErr(apiError(e)); setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Discharge ${patient}`}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={go} disabled={busy || summary.trim().length < 10} className={btnPrimary}>{busy ? "Discharging…" : "Confirm discharge"}</button></>}>
      <div className="space-y-4">
        <Notice kind="info">The bed is released and marked <b>needs cleaning</b>. The summary is kept in the admission record.</Notice>
        <Field label="Condition at discharge">{(p) => <select {...p} value={condition} onChange={(e) => setCondition(e.target.value)} className={inputCls}><option value="improved">Improved</option><option value="stable">Stable</option><option value="deteriorated">Deteriorated</option><option value="against_advice">Left against medical advice</option><option value="other">Other</option></select>}</Field>
        <Field label="Discharge summary" hint={`Diagnosis, treatment given, medicines to continue, follow-up. At least 10 characters (${summary.trim().length}).`}>{(p) => <textarea {...p} rows={6} maxLength={6000} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} data-autofocus />}</Field>
        {err && <Notice kind="error">{err}</Notice>}
      </div>
    </Modal>
  );
}

export function TransferModal({ admissionId, patient, currentBedId, wards, onClose, onDone }: { admissionId: number; patient: string; currentBedId: number; wards: WardLite[]; onClose: () => void; onDone: () => void }) {
  const [bedId, setBedId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const options = wards.map((w) => ({ w, beds: w.beds.filter((b) => b.status === "available" && (b.cleaning_status ?? "clean") === "clean" && b.id !== currentBedId) })).filter((x) => x.beds.length);

  async function go() {
    setBusy(true); setErr("");
    try { await api.post(`/admissions/${admissionId}/transfer`, { bed_id: Number(bedId), reason: reason.trim() }); onDone(); }
    catch (e) { setErr(apiError(e)); setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Transfer ${patient}`}
      footer={<><button onClick={onClose} className={btnGhost}>Cancel</button><button onClick={go} disabled={busy || !bedId || reason.trim().length < 3} className={btnPrimary}>{busy ? "Transferring…" : "Transfer"}</button></>}>
      <div className="space-y-4">
        {options.length === 0 ? <Notice kind="warn">No clean, available beds right now.</Notice> : (
          <Field label="Move to bed">{(p) => <select {...p} value={bedId} onChange={(e) => setBedId(e.target.value)} className={inputCls}><option value="">Select a bed…</option>{options.map(({ w, beds }) => <optgroup key={w.id} label={w.name}>{beds.map((b) => <option key={b.id} value={b.id}>Bed #{b.bed_number}</option>)}</optgroup>)}</select>}</Field>
        )}
        <Field label="Reason for transfer">{(p) => <input {...p} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />}</Field>
        <p className="text-xs text-[var(--muted)]">The old bed is released and marked needs cleaning.</p>
        {err && <Notice kind="error">{err}</Notice>}
      </div>
    </Modal>
  );
}

export function CleaningModal({ bedId, bedNumber, onClose, onDone }: { bedId: number; bedNumber: string; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    try { await api.put(`/beds/${bedId}/cleaned`); onDone(); } catch (e) { setErr(apiError(e)); setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Bed #${bedNumber} needs cleaning`}
      footer={<><button onClick={onClose} className={btnGhost}>Close</button><button onClick={go} disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Mark as cleaned"}</button></>}>
      <p className="text-sm">After a discharge or transfer the bed cannot be given to a new patient until housekeeping has cleaned it. Confirm once it is ready.</p>
      {err && <div className="mt-3"><Notice kind="error">{err}</Notice></div>}
    </Modal>
  );
}
