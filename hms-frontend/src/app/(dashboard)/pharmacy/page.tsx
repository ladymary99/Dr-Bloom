"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type PrescriptionItem = {
  id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration_days: number | null;
  instructions: string | null;
};

type Prescription = {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  items: PrescriptionItem[];
  visit: {
    patient: {
      id: string;
      first_name: string;
      last_name: string;
      mrn: string;
    };
  };
  doctor: { user: { name: string } } | null;
  dispensedBy: { name: string } | null;
};

type InventoryItem = {
  id: number;
  item_name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  unit_price: string | number;
  min_level: number;
  supplier: string | null;
};

const pill: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  dispensed: "bg-emerald-100 text-emerald-700",
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

export default function PharmacyPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salePatientId, setSalePatientId] = useState("");
  const [saleItemId, setSaleItemId] = useState("");
  const [saleQty, setSaleQty] = useState("1");
  const [saleMethod, setSaleMethod] = useState("cash");
  const [saleNote, setSaleNote] = useState("");
  const [saving, setSaving] = useState(false);

  const lowStock = useMemo(
    () => stock.filter((item) => Number(item.quantity) <= Number(item.min_level)).length,
    [stock]
  );

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [prescriptionRes, stockRes] = await Promise.all([
        api.get("/pharmacy/prescriptions"),
        api.get("/pharmacy/stock"),
      ]);

      setPrescriptions(prescriptionRes.data);
      setStock(stockRes.data);
    } catch {
      setError("Could not load pharmacy queue and stock.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function dispense(prescription: Prescription) {
    const items = prescription.items.map((i) => ({ id: i.id, quantity: 1 }));

    try {
      await api.post(`/pharmacy/prescriptions/${prescription.id}/dispense`, { items });
      await load();
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? "Could not dispense the prescription.");
    }
  }

  async function directSale() {
    if (!salePatientId || !saleItemId) {
      setError("Choose a patient and at least one item.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.post("/pharmacy/sale", {
        patient_id: salePatientId,
        items: [{
          item_id: Number(saleItemId),
          quantity: Number(saleQty) || 1,
          unit_price: undefined,
        }],
        payment_method: saleMethod,
        description: saleNote || "Pharmacy direct sale",
      });

      setSalePatientId("");
      setSaleItemId("");
      setSaleQty("1");
      setSaleMethod("cash");
      setSaleNote("");
      await load();
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? "Could not record the sale.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Pharmacy</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Review pending prescriptions, dispense medicines, and record direct sales.</p>
        </div>
        <div className={`rounded-full px-4 py-1.5 text-sm font-semibold ${lowStock > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
          {lowStock} low-stock {lowStock === 1 ? "item" : "items"}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className={cardCls}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Prescription queue</h2>
              <span className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-0.5 text-xs font-semibold tabular-nums text-[var(--primary)]">
                {prescriptions.length} pending
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--border)]/60 p-4">
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-40 animate-pulse rounded bg-[var(--primary-tint)]/20" />
                      <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--primary-tint)]/20" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-8 animate-pulse rounded-xl bg-[var(--primary-tint)]/15" />
                      <div className="h-8 w-3/4 animate-pulse rounded-xl bg-[var(--primary-tint)]/15" />
                    </div>
                  </div>
                ))}
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">No prescriptions waiting.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-2xl border border-[var(--border)]/60 p-4 transition hover:border-[var(--primary-tint)]/60 hover:shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-heading font-semibold text-[var(--ink)]">
                          {rx.visit.patient.first_name} {rx.visit.patient.last_name}
                        </h3>
                        <p className="text-xs font-medium text-[var(--primary)]">{rx.visit.patient.mrn}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${pill[rx.status] ?? "bg-[var(--primary-tint)]/15 text-[var(--muted)]"}`}>
                          {rx.status}
                        </span>
                        <button
                          onClick={() => dispense(rx)}
                          className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-40 disabled:hover:translate-y-0"
                          disabled={rx.status !== "pending"}
                        >
                          Dispense
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm">
                      {rx.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-xl bg-[var(--primary-tint)]/10 px-3 py-2">
                          <span className="text-[var(--ink)]">
                            {item.medicine_name} · {item.dosage} · {item.frequency}
                          </span>
                          <span className="text-xs tabular-nums text-[var(--muted)]">{item.duration_days ?? "—"}d</span>
                        </div>
                      ))}
                    </div>

                    {rx.notes && <p className="mt-3 text-sm text-[var(--muted)]"><b className="font-medium text-[var(--ink)]">Note:</b> {rx.notes}</p>}
                    <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>Doctor: {rx.doctor?.user?.name ?? "—"}</span>
                      <span className="tabular-nums">{new Date(rx.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardCls}>
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Direct sale</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Patient ID</label>
                <input
                  value={salePatientId}
                  onChange={(e) => setSalePatientId(e.target.value)}
                  className={inputCls}
                  placeholder="uuid for patient"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Item</label>
                <select
                  value={saleItemId}
                  onChange={(e) => setSaleItemId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select item</option>
                  {stock.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} ({item.quantity} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={saleQty}
                    onChange={(e) => setSaleQty(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Payment</label>
                  <select
                    value={saleMethod}
                    onChange={(e) => setSaleMethod(e.target.value)}
                    className={inputCls}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Note</label>
                <input
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  className={inputCls}
                  placeholder="Optional sale note"
                />
              </div>

              <button
                onClick={directSale}
                disabled={saving}
                className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-600/20 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {saving ? "Recording sale…" : "Complete direct sale"}
              </button>
            </div>
          </div>

          <div className={cardCls}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Inventory stock</h2>
              <span className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-0.5 text-xs font-semibold tabular-nums text-[var(--primary)]">{stock.length} items</span>
            </div>

            <div className="space-y-2">
              {stock.map((item) => {
                const low = Number(item.quantity) <= Number(item.min_level);
                return (
                  <div key={item.id} className={`rounded-xl border px-3 py-2 transition ${low ? "border-amber-200 bg-amber-50" : "border-[var(--border)]/60 bg-[var(--primary-tint)]/5"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[var(--ink)]">{item.item_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${low ? "bg-amber-200 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                        {low ? "Low" : "OK"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-[var(--muted)]">
                      {item.quantity} {item.unit ?? "units"} · {Number(item.unit_price).toFixed(2)} per unit
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}