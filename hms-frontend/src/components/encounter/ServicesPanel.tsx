"use client";

import { money } from "@/lib/format";
import { btnGhost, inputCls } from "@/components/ui";

export type Service = { description: string; quantity: string; unit_price: string };

/** Services performed in the visit. They become invoice lines when the visit is completed. */
export default function ServicesPanel({ services, onChange, invoice, disabled }: {
  services: Service[]; onChange: (s: Service[]) => void; invoice: { invoice_number: string; amount: string; status: string } | null; disabled?: boolean;
}) {
  const total = services.reduce((s, x) => s + (Number(x.quantity) || 0) * (Number(x.unit_price) || 0), 0);
  const set = (i: number, patch: Partial<Service>) => onChange(services.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  return (
    <div>
      {invoice && <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-[var(--muted)]">Invoice <b>{invoice.invoice_number}</b> ({money(invoice.amount)}, {invoice.status}) already exists for this visit. Services below are added to it.</p>}
      {services.length === 0 && <p className="mb-3 text-sm text-[var(--muted)]">No billable services added.</p>}
      {services.map((s, i) => (
        <div key={i} className="mb-2 grid grid-cols-[1fr_4.5rem_6.5rem_auto] items-center gap-2">
          <input aria-label="Service" disabled={disabled} value={s.description} maxLength={255} onChange={(e) => set(i, { description: e.target.value })} className={inputCls} placeholder="Service" />
          <input aria-label="Quantity" disabled={disabled} type="number" min="0.01" step="0.01" value={s.quantity} onChange={(e) => set(i, { quantity: e.target.value })} className={inputCls} />
          <input aria-label="Unit price" disabled={disabled} type="number" min="0" step="0.01" value={s.unit_price} onChange={(e) => set(i, { unit_price: e.target.value })} className={inputCls} />
          {!disabled && <button type="button" aria-label="Remove service" onClick={() => onChange(services.filter((_, n) => n !== i))} className="h-9 w-9 rounded-full text-lg text-red-700 hover:bg-red-50">×</button>}
        </div>
      ))}
      {!disabled && <button type="button" onClick={() => onChange([...services, { description: "", quantity: "1", unit_price: "" }])} className={`${btnGhost} mt-1`}>+ Add service</button>}
      {services.length > 0 && <p className="mt-3 text-right text-sm">Total to bill: <b className="font-heading text-base">{money(total)}</b></p>}
    </div>
  );
}
