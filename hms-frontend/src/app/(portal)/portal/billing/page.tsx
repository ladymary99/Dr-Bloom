"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Invoice = {
  id: number;
  invoice_number: string;
  description: string;
  amount: string;
  status: string;
  created_at: string;
  payment_method: string | null;
  department: { name: string } | null;
  doctor: { user: { name: string } } | null;
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm overflow-hidden";

const statusPill: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
};

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/invoices").then((response) => setInvoices(response.data)).catch(() => setError("Could not load billing information."));
  }, []);

  const pendingTotal = invoices?.filter((i) => i.status === "pending").reduce((sum, i) => sum + Number(i.amount), 0) ?? 0;
  const paidTotal = invoices?.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.amount), 0) ?? 0;

  return (
    <div className="animate-fade-up w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Billing</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Invoices and payments on your account.</p>
      </div>

      {/* Summary cards */}
      {invoices && invoices.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className={`${cardCls} !p-5`}>
            <span className="text-[var(--primary)]" aria-hidden>
              <svg {...iconProps} className="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1-1.3-1.5-3-1.5s-3 .6-3 1.75c0 2.5 6 1.25 6 3.75 0 1.15-1.3 1.75-3 1.75s-3-.5-3-1.5"/></svg>
            </span>
            <div className="mt-2 font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">
              ${paidTotal.toFixed(2)}
            </div>
            <div className="mt-0.5 text-xs text-[var(--muted)]">Total paid</div>
          </div>
          <div className={`${cardCls} !p-5`}>
            <span className="text-amber-600" aria-hidden>
              <svg {...iconProps} className="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            </span>
            <div className={`mt-2 font-heading text-2xl font-bold tabular-nums ${pendingTotal > 0 ? "text-amber-600" : "text-[var(--ink)]"}`}>
              ${pendingTotal.toFixed(2)}
            </div>
            <div className="mt-0.5 text-xs text-[var(--muted)]">Outstanding balance</div>
          </div>
        </div>
      )}

      {/* Outstanding balance alert */}
      {pendingTotal > 0 && (
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <svg {...iconProps} className="mt-0.5 h-4 w-4 flex-none text-amber-600"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01"/></svg>
          <p className="text-sm text-amber-800">
            Outstanding balance: <b>${pendingTotal.toFixed(2)}</b>. Please pay at the reception desk.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg {...iconProps} className="h-4 w-4 flex-none"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {error}
        </div>
      )}

      {/* Invoices table */}
      <div className={cardCls}>
        <div className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
          <h2 className="font-heading font-semibold text-[var(--ink)]">Invoices ({invoices?.length ?? "—"})</h2>
        </div>
        {!invoices ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-[var(--primary-tint)]/15" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No bills have been added to your account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-155 text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted)]">
                  <th className="px-6 py-3.5">Invoice</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--primary)]">{invoice.invoice_number}</div>
                      <div className="text-xs tabular-nums text-[var(--muted)]">{new Date(invoice.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[var(--ink)]">{invoice.description}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {invoice.department?.name ?? ""}
                        {invoice.doctor ? ` · Dr. ${invoice.doctor.user.name}` : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums text-[var(--ink)]">
                      ${Number(invoice.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusPill[invoice.status] ?? "bg-[var(--primary-tint)]/15 text-[var(--muted)]"}`}>
                        {invoice.status}
                      </span>
                      {invoice.payment_method && (
                        <div className="mt-1 text-xs capitalize text-[var(--muted)]">{invoice.payment_method}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}