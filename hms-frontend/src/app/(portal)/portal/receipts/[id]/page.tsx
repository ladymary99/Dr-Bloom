"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { fmtDateTime, money } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
import { ErrorState, ListSkeleton, btnGhost, btnPrimary, cardCls } from "@/components/ui";

type Receipt = {
  clinic: string; receipt_number: string; paid_at: string; method: string; amount: string;
  patient: { name: string; mrn: string };
  invoice: { number: string; description: string; total: string; paid: string; balance: string; status: string; items: { id: number; description: string; quantity: string; unit_price: string; total: string }[] };
};

export default function ReceiptPrint() {
  const { id } = useParams<{ id: string }>();
  const { data: r, error, reload } = useFetch<Receipt>(`/portal/payments/${id}/receipt`);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex flex-wrap justify-between gap-2">
        <Link href="/portal/billing" className={btnGhost}>← Back to billing</Link>
        <button onClick={() => window.print()} className={btnPrimary}>Print / Save as PDF</button>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : !r ? <ListSkeleton rows={2} /> : (
        <article className={`${cardCls} print-sheet p-8`}>
          <header className="flex items-start justify-between border-b-2 border-[var(--primary)] pb-4">
            <div><h1 className="font-heading text-2xl font-bold text-[var(--primary)]">{r.clinic}</h1><p className="text-sm text-[var(--muted)]">Payment receipt</p></div>
            <div className="text-right text-sm"><p className="font-semibold">{r.receipt_number}</p><p className="text-[var(--muted)]">{fmtDateTime(r.paid_at)}</p></div>
          </header>
          <section className="grid gap-2 py-4 text-sm sm:grid-cols-2">
            <p><span className="text-[var(--muted)]">Received from: </span><strong>{r.patient.name}</strong></p>
            <p><span className="text-[var(--muted)]">MRN: </span>{r.patient.mrn}</p>
            <p><span className="text-[var(--muted)]">Invoice: </span>{r.invoice.number}</p>
            <p><span className="text-[var(--muted)]">Method: </span><span className="capitalize">{r.method.replace("_", " ")}</span></p>
          </section>
          <table className="w-full text-left text-sm">
            <thead className="border-y border-[var(--border)] text-xs text-[var(--muted)]"><tr><th scope="col" className="py-2">Description</th><th scope="col" className="py-2 text-right">Qty</th><th scope="col" className="py-2 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(r.invoice.items.length ? r.invoice.items : [{ id: 0, description: r.invoice.description, quantity: "1", unit_price: r.invoice.total, total: r.invoice.total }]).map((i) => <tr key={i.id}><td className="py-2">{i.description}</td><td className="py-2 text-right">{Number(i.quantity)}</td><td className="py-2 text-right">{money(i.total)}</td></tr>)}
            </tbody>
          </table>
          <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
            <p className="flex justify-between"><span>Invoice total</span><span>{money(r.invoice.total)}</span></p>
            <p className="flex justify-between font-heading text-lg font-semibold"><span>Paid now</span><span>{money(r.amount)}</span></p>
            <p className="flex justify-between text-[var(--muted)]"><span>Remaining balance</span><span>{money(r.invoice.balance)}</span></p>
          </div>
          <footer className="mt-8 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">Thank you for your payment. This receipt was generated electronically and is valid without a signature.</footer>
        </article>
      )}
    </div>
  );
}
