"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDate, money } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { ErrorState, Field, ListSkeleton, Modal, Notice, StatusBadge, btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/ui";

type Item = { id: number; description: string; quantity: string; unit_price: string; total: string };
type Pay = { id: string; amount: string; method: string; status: string; paid_at: string | null; receipt_number: string | null };
type Claim = { id: number; provider: string; claim_number: string | null; amount_claimed: string; amount_approved: string | null; status: string };
type Inv = {
  id: number; invoice_number: string; description: string; amount: string; amount_paid: string; balance: string; status: string;
  patient: { first_name: string; last_name: string; mrn: string; insurance_provider?: string | null } | null;
  items: Item[]; payments: Pay[]; claims: Claim[];
};

/** Reception/finance view of one invoice: line items, payments (ledger), refunds, insurance claims. */
export default function InvoiceManager({ invoiceId, onClose, onChanged }: { invoiceId: number | null; onClose: () => void; onChanged: () => void }) {
  const isAdmin = useAuthStore((s) => s.roles.includes("admin"));
  const [inv, setInv] = useState<Inv | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [item, setItem] = useState({ description: "", quantity: "1", unit_price: "" });
  const [pay, setPay] = useState({ amount: "", method: "cash", notes: "" });
  const [claim, setClaim] = useState({ provider: "", claim_number: "", amount_claimed: "" });

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setError("");
    try {
      const { data } = await api.get<Inv>(`/invoices/${invoiceId}`);
      setInv(data);
      setPay((p) => ({ ...p, amount: Number(data.balance) > 0 ? data.balance : "" }));
      setClaim((c) => ({ ...c, amount_claimed: data.amount }));
    } catch (e) {
      setError(apiError(e));
    }
  }, [invoiceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInv(null); setMsg(null);
    load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: "success", text: ok }); await load(); onChanged(); }
    catch (e) { setMsg({ kind: "error", text: apiError(e) }); }
    finally { setBusy(false); }
  }

  const closed = !!inv && ["paid", "cancelled", "refunded"].includes(inv.status);

  return (
    <Modal open={!!invoiceId} onClose={onClose} wide title={inv ? `Invoice ${inv.invoice_number}` : "Invoice"} footer={<button onClick={onClose} className={btnGhost}>Close</button>}>
      {error ? <ErrorState message={error} onRetry={load} /> : !inv ? <ListSkeleton rows={2} /> : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div><p className="font-semibold">{inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : "—"} <span className="font-normal text-[var(--muted)]">· {inv.patient?.mrn}</span></p><p className="text-[var(--muted)]">{inv.description}</p></div>
            <div className="text-right"><StatusBadge status={inv.status} /><p className="mt-1 text-xs text-[var(--muted)]">Total {money(inv.amount)} · Paid {money(inv.amount_paid)} · <strong className="text-[var(--ink)]">Balance {money(inv.balance)}</strong></p></div>
          </div>
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

          <section aria-label="Line items">
            <h3 className="mb-2 text-xs font-semibold text-[var(--muted)]">Line items</h3>
            <table className="w-full text-left text-sm"><thead className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><tr><th scope="col" className="py-1.5">Item</th><th scope="col" className="py-1.5 text-right">Qty</th><th scope="col" className="py-1.5 text-right">Price</th><th scope="col" className="py-1.5 text-right">Total</th></tr></thead>
              <tbody className="divide-y divide-[var(--border)]">{inv.items.map((i) => <tr key={i.id}><td className="py-1.5">{i.description}</td><td className="py-1.5 text-right">{Number(i.quantity)}</td><td className="py-1.5 text-right">{money(i.unit_price)}</td><td className="py-1.5 text-right font-semibold">{money(i.total)}</td></tr>)}</tbody></table>
            {!closed && (
              <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/invoices/${inv.id}/items`, item); setItem({ description: "", quantity: "1", unit_price: "" }); }, "Item added."); }} className="mt-3 grid gap-2 sm:grid-cols-[1fr_5rem_7rem_auto] sm:items-end">
                <Field label="Description">{(p) => <input {...p} required value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} className={inputCls} />}</Field>
                <Field label="Qty">{(p) => <input {...p} required type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} className={inputCls} />}</Field>
                <Field label="Unit price">{(p) => <input {...p} required type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => setItem({ ...item, unit_price: e.target.value })} className={inputCls} />}</Field>
                <button disabled={busy} className={btnGhost}>Add</button>
              </form>
            )}
          </section>

          <section aria-label="Payments">
            <h3 className="mb-2 text-xs font-semibold text-[var(--muted)]">Payments</h3>
            {inv.payments.length === 0 ? <p className="text-sm text-[var(--muted)]">No payments recorded.</p> : (
              <ul className="divide-y divide-[var(--border)] text-sm">{inv.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{fmtShortDate(p.paid_at)} · <span className="capitalize">{p.method.replace("_", " ")}</span> · <StatusBadge status={p.status} /> {p.receipt_number && <span className="text-xs text-[var(--muted)]">{p.receipt_number}</span>}</span>
                  <span className="flex items-center gap-2"><strong>{money(p.amount)}</strong>
                    {isAdmin && p.status === "succeeded" && <button disabled={busy} onClick={() => { const reason = window.prompt("Reason for refund?"); if (reason) run(() => api.post(`/payments/${p.id}/refund`, { reason }), "Payment refunded."); }} className={`${btnDanger} !px-3 !py-1 text-xs`}>Refund</button>}</span>
                </li>))}</ul>
            )}
            {!closed && (
              <form onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/invoices/${inv.id}/payments`, pay), "Payment recorded and receipt issued."); }} className="mt-3 grid gap-2 sm:grid-cols-[8rem_10rem_1fr_auto] sm:items-end">
                <Field label="Amount">{(p) => <input {...p} required type="number" min="0.01" step="0.01" max={inv.balance} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={inputCls} />}</Field>
                <Field label="Method">{(p) => <select {...p} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} className={inputCls}>{["cash", "card", "bank_transfer", "insurance", "other"].map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}</select>}</Field>
                <Field label="Note (optional)">{(p) => <input {...p} maxLength={300} value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} className={inputCls} />}</Field>
                <button disabled={busy} className={btnPrimary}>Record payment</button>
              </form>
            )}
          </section>

          <section aria-label="Insurance claims">
            <h3 className="mb-2 text-xs font-semibold text-[var(--muted)]">Insurance claims</h3>
            {inv.claims.length > 0 && <ul className="mb-3 divide-y divide-[var(--border)] text-sm">{inv.claims.map((c) => <li key={c.id} className="flex items-center justify-between py-2"><span>{c.provider}{c.claim_number ? ` · ${c.claim_number}` : ""} · {money(c.amount_claimed)}</span><StatusBadge status={c.status} kind="claim" /></li>)}</ul>}
            {inv.status !== "cancelled" && (
              <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/invoices/${inv.id}/claims`, { ...claim, claim_number: claim.claim_number || undefined }); setClaim({ provider: "", claim_number: "", amount_claimed: inv.amount }); }, "Claim submitted. Manage its status under Insurance Claims."); }} className="grid gap-2 sm:grid-cols-[1fr_9rem_8rem_auto] sm:items-end">
                <Field label="Insurer" hint={inv.patient?.insurance_provider ? `On file: ${inv.patient.insurance_provider}` : undefined}>{(p) => <input {...p} required value={claim.provider} onChange={(e) => setClaim({ ...claim, provider: e.target.value })} className={inputCls} />}</Field>
                <Field label="Claim no.">{(p) => <input {...p} value={claim.claim_number} onChange={(e) => setClaim({ ...claim, claim_number: e.target.value })} className={inputCls} />}</Field>
                <Field label="Amount">{(p) => <input {...p} required type="number" min="0" step="0.01" max={inv.amount} value={claim.amount_claimed} onChange={(e) => setClaim({ ...claim, amount_claimed: e.target.value })} className={inputCls} />}</Field>
                <button disabled={busy} className={btnGhost}>Submit claim</button>
              </form>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
