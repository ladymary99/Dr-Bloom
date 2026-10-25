"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDate, money } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
import { EmptyState, ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, StatusBadge, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Claim = {
  id: number; provider: string; claim_number: string | null; amount_claimed: string; amount_approved: string | null; status: string; submitted_at: string | null; notes: string | null;
  patient?: { first_name: string; last_name: string; mrn: string } | null; invoice?: { invoice_number: string; status: string } | null;
};
type Page = { data: Claim[]; current_page: number; last_page: number };

export default function ClaimsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useFetch<Page>("/claims", { status: status || undefined, page });
  const [edit, setEdit] = useState<Claim | null>(null);
  const [f, setF] = useState({ status: "submitted", amount_approved: "", claim_number: "", notes: "" });
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function open(c: Claim) {
    setEdit(c); setMsg(null);
    setF({ status: c.status, amount_approved: c.amount_approved ?? "", claim_number: c.claim_number ?? "", notes: c.notes ?? "" });
  }
  async function save() {
    if (!edit) return;
    setBusy(true); setMsg(null);
    try {
      await api.put(`/claims/${edit.id}`, { status: f.status, amount_approved: f.amount_approved === "" ? undefined : Number(f.amount_approved), claim_number: f.claim_number || undefined, notes: f.notes || undefined });
      setEdit(null); setMsg({ kind: "success", text: "Claim updated. The patient was notified." }); reload();
    } catch (e) { setMsg({ kind: "error", text: apiError(e) }); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Insurance claims" subtitle="Track claims submitted to insurers. Marking a claim as paid books the payout into the invoice." />
      {msg && !edit && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      <div className="mb-4"><label htmlFor="claim-status" className="sr-only">Filter by status</label>
        <select id="claim-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
          <option value="">All statuses</option>{["submitted", "in_review", "approved", "rejected", "paid"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select></div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <ListSkeleton rows={3} />
        : (data?.data ?? []).length === 0 ? <EmptyState title="No claims" hint="Submit a claim from an invoice: Payments → Manage → Insurance claims." />
        : (
          <div className={`${cardCls} overflow-x-auto`}>
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">Insurance claims</caption>
              <thead className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><tr><th scope="col" className="px-5 py-3">Patient</th><th scope="col" className="px-3 py-3">Insurer</th><th scope="col" className="px-3 py-3">Invoice</th><th scope="col" className="px-3 py-3 text-right">Claimed</th><th scope="col" className="px-3 py-3 text-right">Approved</th><th scope="col" className="px-3 py-3">Status</th><th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data?.data.map((c) => (
                  <tr key={c.id}>
                    <th scope="row" className="px-5 py-3 font-medium">{c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : "—"}<span className="block text-xs font-normal text-[var(--muted)]">{c.patient?.mrn} · {fmtShortDate(c.submitted_at)}</span></th>
                    <td className="px-3 py-3">{c.provider}<span className="block text-xs text-[var(--muted)]">{c.claim_number}</span></td>
                    <td className="px-3 py-3">{c.invoice?.invoice_number}</td>
                    <td className="px-3 py-3 text-right">{money(c.amount_claimed)}</td>
                    <td className="px-3 py-3 text-right">{c.amount_approved ? money(c.amount_approved) : "—"}</td>
                    <td className="px-3 py-3"><StatusBadge status={c.status} kind="claim" /></td>
                    <td className="px-5 py-3 text-right"><button onClick={() => open(c)} className={btnGhost}>Update</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data && data.last_page > 1 && <div className="flex items-center justify-between border-t border-[var(--border)] p-3 text-sm"><button disabled={page === 1} onClick={() => setPage(page - 1)} className={btnGhost}>← Previous</button><span>Page {data.current_page} of {data.last_page}</span><button disabled={page === data.last_page} onClick={() => setPage(page + 1)} className={btnGhost}>Next →</button></div>}
          </div>
        )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Update claim" footer={<><button onClick={() => setEdit(null)} className={btnGhost}>Cancel</button><button onClick={save} disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Save"}</button></>}>
        {edit && (
          <div className="space-y-4">
            <p className="text-sm">{edit.patient?.first_name} {edit.patient?.last_name} · {edit.provider} · claimed {money(edit.amount_claimed)}</p>
            <Field label="Status">{(p) => <select {...p} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={inputCls}>{["submitted", "in_review", "approved", "rejected", "paid"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>}</Field>
            <Field label="Approved amount" hint="Required for approved / paid. Marking as paid records an insurance payment on the invoice.">{(p) => <input {...p} type="number" min="0" step="0.01" max={edit.amount_claimed} value={f.amount_approved} onChange={(e) => setF({ ...f, amount_approved: e.target.value })} className={inputCls} />}</Field>
            <Field label="Claim number">{(p) => <input {...p} value={f.claim_number} onChange={(e) => setF({ ...f, claim_number: e.target.value })} className={inputCls} />}</Field>
            <Field label="Notes">{(p) => <textarea {...p} rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={inputCls} />}</Field>
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          </div>
        )}
      </Modal>
    </div>
  );
}
