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

const statusClasses: Record<string, string> = {
  paid: "bg-green-50 text-green-800",
  pending: "bg-amber-50 text-amber-800",
  cancelled: "bg-red-50 text-red-700",
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/invoices").then((response) => setInvoices(response.data)).catch(() => setError("Could not load billing information."));
  }, []);

  const pendingTotal = invoices?.filter((invoice) => invoice.status === "pending").reduce((sum, invoice) => sum + Number(invoice.amount), 0) ?? 0;

  return (
    <div>
      <header>
        <p className="text-sm font-medium text-blue-700">Account</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Billing</h1>
      </header>

      {pendingTotal > 0 && <p className="mt-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">Outstanding balance: <b>${pendingTotal.toFixed(2)}</b>. Please pay at the reception desk.</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <section className="mt-5 border-y border-slate-200 bg-white sm:border">
        {!invoices ? <p className="p-10 text-center text-slate-500">Loading billing information…</p> : invoices.length === 0 ? <p className="p-10 text-center text-slate-500">No bills have been added to your account.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-155 text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-xs text-slate-500"><th className="px-5 py-3 font-medium">Invoice</th><th className="px-5 py-3 font-medium">Description</th><th className="px-5 py-3 text-right font-medium">Amount</th><th className="px-5 py-3 font-medium">Status</th></tr></thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3"><div className="font-medium text-blue-800">{invoice.invoice_number}</div><div className="text-xs text-slate-500">{new Date(invoice.created_at).toLocaleDateString()}</div></td>
                    <td className="px-5 py-3 text-slate-700">{invoice.description}<div className="text-xs text-slate-500">{invoice.department?.name ?? ""}{invoice.doctor ? ` · ${invoice.doctor.user.name}` : ""}</div></td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-slate-900">${Number(invoice.amount).toFixed(2)}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClasses[invoice.status] ?? "bg-slate-100 text-slate-700"}`}>{invoice.status}</span>{invoice.payment_method && <div className="mt-1 text-xs capitalize text-slate-500">{invoice.payment_method}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
