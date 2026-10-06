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
  pending: "bg-amber-50 text-amber-700",
  dispensed: "bg-emerald-50 text-emerald-700",
};

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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pharmacy</h1>
          <p className="mt-1 text-sm text-slate-500">Review pending prescriptions, dispense medicines, and record direct sales.</p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
          {lowStock} low-stock items
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Prescription queue</h2>
              <span className="text-sm text-slate-500">{prescriptions.length} pending</span>
            </div>

            {loading ? (
              <div className="p-6 text-center text-slate-500">Loading…</div>
            ) : prescriptions.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No prescriptions waiting.</div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {rx.visit.patient.first_name} {rx.visit.patient.last_name}
                        </h3>
                        <p className="text-xs text-blue-700">{rx.visit.patient.mrn}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${pill[rx.status] ?? "bg-slate-100 text-slate-700"}`}>
                          {rx.status}
                        </span>
                        <button
                          onClick={() => dispense(rx)}
                          className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                          disabled={rx.status !== "pending"}
                        >
                          Dispense
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {rx.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                          <span>
                            {item.medicine_name} · {item.dosage} · {item.frequency}
                          </span>
                          <span className="text-xs text-slate-500">{item.duration_days ?? "—"}d</span>
                        </div>
                      ))}
                    </div>

                    {rx.notes && <p className="mt-3 text-sm text-slate-600">Note: {rx.notes}</p>}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Doctor: {rx.doctor?.user?.name ?? "—"}</span>
                      <span>{new Date(rx.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Direct sale</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Patient ID</label>
                <input
                  value={salePatientId}
                  onChange={(e) => setSalePatientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="uuid for patient"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Item</label>
                <select
                  value={saleItemId}
                  onChange={(e) => setSaleItemId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={saleQty}
                    onChange={(e) => setSaleQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Payment</label>
                  <select
                    value={saleMethod}
                    onChange={(e) => setSaleMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
                <input
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  placeholder="Optional sale note"
                />
              </div>

              <button
                onClick={directSale}
                disabled={saving}
                className="w-full rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Recording sale…" : "Complete direct sale"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Inventory stock</h2>
              <span className="text-xs text-slate-500">{stock.length} items</span>
            </div>

            <div className="space-y-2">
              {stock.map((item) => {
                const low = Number(item.quantity) <= Number(item.min_level);
                return (
                  <div key={item.id} className={`rounded-xl border px-3 py-2 ${low ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-800">{item.item_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${low ? "bg-amber-200 text-amber-800" : "bg-slate-200 text-slate-700"}`}>
                        {low ? "Low" : "OK"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
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
