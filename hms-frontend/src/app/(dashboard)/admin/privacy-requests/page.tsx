"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtDateTime } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
import { EmptyState, ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, StatusBadge, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Req = { id: string; type: "export" | "delete"; status: string; reason: string | null; admin_notes: string | null; created_at: string; resolved_at: string | null; patient?: { first_name: string; last_name: string; mrn: string; email: string | null } | null };
type Page = { data: Req[]; current_page: number; last_page: number };

export default function PrivacyRequestsPage() {
  const [status, setStatus] = useState("pending");
  const { data, error, loading, reload } = useFetch<Page>("/admin/data-requests", { status: status || undefined });
  const [target, setTarget] = useState<Req | null>(null);
  const [action, setAction] = useState<"processing" | "completed" | "rejected">("processing");
  const [notes, setNotes] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function open(r: Req, a: typeof action) { setTarget(r); setAction(a); setNotes(r.admin_notes ?? ""); setTyped(""); setMsg(null); }
  const erase = target?.type === "delete" && action === "completed";
  const mrn = target?.patient?.mrn ?? "";

  async function submit() {
    if (!target) return;
    setBusy(true);
    try {
      await api.put(`/admin/data-requests/${target.id}`, { status: action, admin_notes: notes || undefined, confirm_erasure: erase ? true : undefined });
      setTarget(null); setMsg({ kind: "success", text: erase ? "Patient identity erased and account closed." : "Request updated." }); reload();
    } catch (e) { setMsg({ kind: "error", text: apiError(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Privacy requests" subtitle="Patient data-export and account-deletion requests. Every action here is written to the audit log." />
      {msg && !target && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      <div className="mb-4"><label htmlFor="pr-status" className="sr-only">Filter by status</label>
        <select id="pr-status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
          <option value="">All</option>{["pending", "processing", "completed", "rejected"].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <ListSkeleton rows={3} />
        : (data?.data ?? []).length === 0 ? <EmptyState title="No requests" hint="Patients can file requests under Settings → Privacy & data." />
        : (
          <ul className="space-y-3">
            {data?.data.map((r) => (
              <li key={r.id} className={`${cardCls} flex flex-wrap items-center gap-4 p-5`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-base font-semibold">{r.patient ? `${r.patient.first_name} ${r.patient.last_name}` : "Patient"}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.type === "delete" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-900"}`}>{r.type === "delete" ? "Erasure" : "Data export"}</span><StatusBadge status={r.status} /></div>
                  <p className="text-xs text-[var(--muted)]">{r.patient?.mrn} · {r.patient?.email} · requested {fmtDateTime(r.created_at)}</p>
                  {r.reason && <p className="mt-1 text-sm">“{r.reason}”</p>}
                  {r.admin_notes && <p className="mt-1 text-xs text-[var(--muted)]">Notes: {r.admin_notes}</p>}
                </div>
                {["pending", "processing"].includes(r.status) && (
                  <div className="flex flex-wrap gap-2">
                    {r.status === "pending" && <button onClick={() => open(r, "processing")} className={btnGhost}>Start review</button>}
                    <button onClick={() => open(r, "rejected")} className={btnGhost}>Reject</button>
                    <button onClick={() => open(r, "completed")} className={r.type === "delete" ? btnDanger : btnPrimary}>{r.type === "delete" ? "Approve & erase" : "Mark complete"}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

      <Modal open={!!target} onClose={() => setTarget(null)} title={erase ? "Erase this patient's identity?" : action === "rejected" ? "Reject request" : action === "processing" ? "Start review" : "Complete request"}
        footer={<><button onClick={() => setTarget(null)} className={btnGhost}>Cancel</button><button onClick={submit} disabled={busy || (erase && typed !== mrn)} className={erase ? btnDanger : btnPrimary}>{busy ? "Working…" : erase ? "Erase permanently" : "Confirm"}</button></>}>
        <div className="space-y-4">
          {erase && <Notice kind="error">This removes the patient&apos;s name, contact details, documents, messages and login, and cannot be undone. Clinical and billing rows are kept under the anonymous MRN for legal retention.</Notice>}
          {erase && <Field label={`Type the MRN (${mrn}) to confirm`}>{(p) => <input {...p} value={typed} onChange={(e) => setTyped(e.target.value)} className={inputCls} autoComplete="off" />}</Field>}
          <Field label="Notes (kept in the audit trail)">{(p) => <textarea {...p} rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />}</Field>
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        </div>
      </Modal>
    </div>
  );
}
