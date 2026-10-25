"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { apiError, fmtShortDate, money } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useFetch } from "@/hooks/useFetch";
import { EmptyState, ErrorState, ListSkeleton, Modal, Notice, PageHeader, StatusBadge, Tabs, btnGhost, btnPrimary, cardCls } from "@/components/ui";

type Item = { id: number; description: string; quantity: string; unit_price: string; total: string };
type Pay = { id: string; amount: string; method: string; status: string; paid_at: string | null; receipt_number: string | null };
type Claim = { id: number; provider: string; claim_number: string | null; amount_claimed: string; amount_approved: string | null; status: string; submitted_at: string | null; invoice?: { invoice_number: string; description: string } | null };
type Invoice = {
  id: number; invoice_number: string; description: string; amount: string; amount_paid: string; balance: string; status: string;
  created_at: string; due_date: string | null; items: Item[]; payments: Pay[]; claims: Claim[];
  doctor?: { user?: { name: string } } | null; department?: { name: string } | null;
};

const METHOD: Record<string, string> = { cash: "Cash", card: "Card", stripe: "Online card", bank_transfer: "Bank transfer", insurance: "Insurance", other: "Other" };

function Banner() {
  const sp = useSearchParams();
  if (sp.get("paid")) return <div className="mb-4"><Notice kind="success">Thank you! Your payment for {sp.get("paid")} is being confirmed. It may take a few seconds to show as paid.</Notice></div>;
  if (sp.get("cancelled")) return <div className="mb-4"><Notice kind="warn">Payment for {sp.get("cancelled")} was cancelled. You have not been charged.</Notice></div>;
  return null;
}

export default function BillingPage() {
  const t = useT();
  const inv = useFetch<Invoice[]>("/portal/invoices");
  const claims = useFetch<Claim[]>("/portal/claims");
  const [tab, setTab] = useState<"invoices" | "payments" | "claims">("invoices");
  const [open, setOpen] = useState<Invoice | null>(null);
  const [payErr, setPayErr] = useState("");
  const [paying, setPaying] = useState(false);

  const list = inv.data ?? [];
  const owed = list.filter((i) => ["pending", "partial"].includes(i.status)).reduce((s, i) => s + Number(i.balance), 0);
  const payments = list.flatMap((i) => i.payments.filter((p) => p.status === "succeeded").map((p) => ({ ...p, inv: i }))).sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""));

  async function pay(i: Invoice) {
    setPaying(true);
    setPayErr("");
    try {
      const { data } = await api.post(`/portal/invoices/${i.id}/pay`);
      window.location.assign(data.url); // Stripe-hosted checkout
    } catch (e) {
      setPayErr(apiError(e, "Could not start the payment."));
      setPaying(false);
    }
  }

  const canPay = (i: Invoice) => ["pending", "partial"].includes(i.status) && Number(i.balance) > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("Billing")} subtitle="Invoices, receipts and insurance claims." />
      <Suspense fallback={null}><Banner /></Suspense>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className={`${cardCls} p-5`}><p className="text-xs font-semibold text-[var(--muted)]">Amount due</p><p className="font-heading text-2xl font-semibold">{money(owed)}</p></div>
        <div className={`${cardCls} p-5`}><p className="text-xs font-semibold text-[var(--muted)]">Unpaid invoices</p><p className="font-heading text-2xl font-semibold">{list.filter((i) => canPay(i)).length}</p></div>
        <div className={`${cardCls} p-5`}><p className="text-xs font-semibold text-[var(--muted)]">Total paid</p><p className="font-heading text-2xl font-semibold">{money(list.reduce((s, i) => s + Number(i.amount_paid), 0))}</p></div>
      </div>

      <div className="mb-4">
        <Tabs label="Billing" value={tab} onChange={setTab} tabs={[{ id: "invoices", label: t("Invoices"), count: list.length }, { id: "payments", label: "Payment history" }, { id: "claims", label: t("Insurance claims"), count: claims.data?.length }]} />
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "invoices" && (inv.error ? <ErrorState message={inv.error} onRetry={inv.reload} />
          : inv.loading && !inv.data ? <ListSkeleton rows={3} />
          : list.length === 0 ? <EmptyState title="No invoices yet" hint="Your invoices appear here after you book or attend an appointment." action={{ label: t("Book appointment"), href: "/portal/book" }} />
          : (
            <ul className="space-y-3">
              {list.map((i) => (
                <li key={i.id} className={`${cardCls} flex flex-wrap items-center gap-4 p-5`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-base font-semibold">{i.invoice_number}</h2><StatusBadge status={i.status} /></div>
                    <p className="truncate text-sm text-[var(--muted)]">{i.description} · {fmtShortDate(i.created_at)}</p>
                  </div>
                  <div className="text-right"><p className="font-heading text-lg font-semibold">{money(i.amount)}</p>{i.status === "partial" && <p className="text-xs text-[var(--muted)]">{t("Balance")}: {money(i.balance)}</p>}</div>
                  <div className="flex gap-2">
                    <button onClick={() => { setPayErr(""); setOpen(i); }} className={btnGhost}>Details</button>
                    {canPay(i) && <button onClick={() => pay(i)} disabled={paying} className={btnPrimary}>{t("Pay online")}</button>}
                  </div>
                </li>
              ))}
            </ul>
          ))}
        {payErr && !open && <div className="mt-3"><Notice kind="error">{payErr}</Notice></div>}

        {tab === "payments" && (payments.length === 0 ? <EmptyState title="No payments yet" hint="Receipts for your payments will be listed here." />
          : (
            <div className={`${cardCls} overflow-x-auto`}>
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">Payment history</caption>
                <thead className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><tr><th scope="col" className="px-5 py-3">Date</th><th scope="col" className="px-3 py-3">Invoice</th><th scope="col" className="px-3 py-3">Method</th><th scope="col" className="px-3 py-3 text-right">Amount</th><th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Receipt</span></th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3">{fmtShortDate(p.paid_at)}</td><td className="px-3 py-3">{p.inv.invoice_number}</td>
                      <td className="px-3 py-3">{METHOD[p.method] ?? p.method}</td><td className="px-3 py-3 text-right font-semibold">{money(p.amount)}</td>
                      <td className="px-5 py-3 text-right"><Link href={`/portal/receipts/${p.id}`} className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline">{t("Receipt")} {p.receipt_number}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === "claims" && (claims.error ? <ErrorState message={claims.error} onRetry={claims.reload} />
          : claims.loading && !claims.data ? <ListSkeleton rows={2} />
          : (claims.data ?? []).length === 0 ? <EmptyState title="No insurance claims" hint="If the clinic submits a claim to your insurer for a visit, you can follow its status here. Keep your insurance details up to date in your profile." action={{ label: "Update insurance details", href: "/portal/profile" }} />
          : (
            <ul className="space-y-3">
              {claims.data?.map((c) => (
                <li key={c.id} className={`${cardCls} flex flex-wrap items-center gap-4 p-5`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-heading text-base font-semibold">{c.provider}</h2><StatusBadge status={c.status} kind="claim" /></div>
                    <p className="text-sm text-[var(--muted)]">{c.invoice?.invoice_number} · {c.claim_number ? `Claim ${c.claim_number} · ` : ""}submitted {fmtShortDate(c.submitted_at)}</p>
                  </div>
                  <dl className="text-right text-sm"><dt className="text-xs text-[var(--muted)]">Claimed</dt><dd className="font-semibold">{money(c.amount_claimed)}</dd>{c.amount_approved && <><dt className="mt-1 text-xs text-[var(--muted)]">Approved</dt><dd className="font-semibold text-emerald-800">{money(c.amount_approved)}</dd></>}</dl>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Invoice ${open.invoice_number}` : ""} wide
        footer={open && <><button onClick={() => setOpen(null)} className={btnGhost}>{t("Close")}</button>{canPay(open) && <button onClick={() => pay(open)} disabled={paying} className={btnPrimary}>{paying ? "Redirecting…" : `${t("Pay online")} ${money(open.balance)}`}</button>}</>}>
        {open && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div><p className="font-semibold">{open.description}</p><p className="text-[var(--muted)]">{fmtShortDate(open.created_at)}{open.doctor?.user?.name ? ` · Dr. ${open.doctor.user.name}` : ""}{open.department?.name ? ` · ${open.department.name}` : ""}</p></div>
              <StatusBadge status={open.status} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <caption className="sr-only">Line items</caption>
                <thead className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><tr><th scope="col" className="py-2">Item</th><th scope="col" className="py-2 text-right">Qty</th><th scope="col" className="py-2 text-right">Price</th><th scope="col" className="py-2 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {open.items.length === 0 ? <tr><td colSpan={4} className="py-3 text-[var(--muted)]">{open.description}</td></tr>
                    : open.items.map((it) => <tr key={it.id}><td className="py-2">{it.description}</td><td className="py-2 text-right">{Number(it.quantity)}</td><td className="py-2 text-right">{money(it.unit_price)}</td><td className="py-2 text-right font-semibold">{money(it.total)}</td></tr>)}
                </tbody>
                <tfoot className="text-sm">
                  <tr><th scope="row" colSpan={3} className="pt-3 text-right font-medium">Total</th><td className="pt-3 text-right font-semibold">{money(open.amount)}</td></tr>
                  <tr><th scope="row" colSpan={3} className="text-right font-medium">Paid</th><td className="text-right">{money(open.amount_paid)}</td></tr>
                  <tr><th scope="row" colSpan={3} className="text-right font-medium">{t("Balance")}</th><td className="text-right font-heading text-base font-semibold">{money(open.balance)}</td></tr>
                </tfoot>
              </table>
            </div>
            {open.payments.length > 0 && (
              <div><h3 className="mb-2 text-xs font-semibold text-[var(--muted)]">Payments</h3>
                <ul className="divide-y divide-[var(--border)] text-sm">
                  {open.payments.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 py-2"><span>{fmtShortDate(p.paid_at)} · {METHOD[p.method] ?? p.method} · <StatusBadge status={p.status} /></span><span className="flex items-center gap-3"><strong>{money(p.amount)}</strong>{p.status === "succeeded" && <Link href={`/portal/receipts/${p.id}`} className="text-xs font-semibold text-[var(--primary)] underline-offset-2 hover:underline">{t("Receipt")}</Link>}</span></li>)}
                </ul></div>
            )}
            {open.claims.length > 0 && (
              <div><h3 className="mb-2 text-xs font-semibold text-[var(--muted)]">{t("Insurance claims")}</h3>
                <ul className="space-y-1 text-sm">{open.claims.map((c) => <li key={c.id} className="flex items-center justify-between"><span>{c.provider}{c.claim_number ? ` · ${c.claim_number}` : ""}</span><StatusBadge status={c.status} kind="claim" /></li>)}</ul></div>
            )}
            {payErr && <Notice kind="error">{payErr}</Notice>}
          </div>
        )}
      </Modal>
    </div>
  );
}
