"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type DayRow = {
  date: string; label: string;
  total: number; cash: number; card: number; transfer: number;
  online: number; reception: number;
};

type Collection = {
  from: string; to: string;
  days: DayRow[];
  totals: { total: number; invoices: number; pending_sum: number };
};

type DoctorRow = {
  id: number; name: string; department: string;
  revenue: number; invoices: number; appointments: number; visits: number;
};

const money = (v: number) =>
  "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);
    const [c, d] = await Promise.all([
      api.get("/admin/reports/collection", { params: { from: f, to: t } }),
      api.get("/admin/reports/doctors", { params: { from: f, to: t } }),
    ]);
    setCollection(c.data);
    setDoctors(d.data.doctors);
    setLoading(false);
  }, []);

  useEffect(() => { load(from, to).catch(() => setLoading(false)); }, []); // initial only

  async function exportCsv(type: "collection" | "doctors") {
    const res = await api.get(`/admin/reports/export/${type}`, {
      params: { from, to },
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxDay = Math.max(...(collection?.days.map((d) => d.total) ?? [1]), 1);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports Center</h1>
          <p className="mt-1 text-sm text-slate-500">Daily collection and doctor performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-600" />
          <span className="text-sm text-slate-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-600" />
          <button onClick={() => load(from, to)}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading reports…</div>
      ) : (
        <>
          {/* Collection summary */}
          {collection && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: `Collected (${collection.from} → ${collection.to})`, value: money(collection.totals.total), icon: "💰" },
                { label: "Paid invoices", value: collection.totals.invoices, icon: "🧾" },
                { label: "Pending in range", value: money(collection.totals.pending_sum), icon: "⏳" },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xl" aria-hidden>{c.icon}</div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{c.value}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Daily collection table + mini bars */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Daily collection</h2>
              <button onClick={() => exportCsv("collection")}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                ⬇ Download Excel
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-6 py-3 font-medium">Day</th>
                  <th className="px-6 py-3 font-medium">Trend</th>
                  <th className="px-6 py-3 font-medium text-right">Cash</th>
                  <th className="px-6 py-3 font-medium text-right">Card</th>
                  <th className="px-6 py-3 font-medium text-right">Transfer</th>
                  <th className="px-6 py-3 font-medium text-right">Online</th>
                  <th className="px-6 py-3 font-medium text-right">Reception</th>
                  <th className="px-6 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {collection?.days.map((d) => (
                  <tr key={d.date} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3 text-slate-900">{d.label}</td>
                    <td className="px-6 py-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${(d.total / maxDay) * 100}%` }} />
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-600">{money(d.cash)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-600">{money(d.card)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-600">{money(d.transfer)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-blue-700">{money(d.online)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-600">{money(d.reception)}</td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums text-slate-900">{money(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Doctor performance */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-semibold text-slate-900">Doctor performance ({doctors.length})</h2>
              <button onClick={() => exportCsv("doctors")}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                ⬇ Download Excel
              </button>
            </div>
            {doctors.length === 0 ? (
              <div className="p-10 text-center text-slate-500">No doctors found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                    <th className="px-6 py-3 font-medium">#</th>
                    <th className="px-6 py-3 font-medium">Doctor</th>
                    <th className="px-6 py-3 font-medium">Department</th>
                    <th className="px-6 py-3 font-medium text-right">Revenue</th>
                    <th className="px-6 py-3 font-medium text-right">Invoices</th>
                    <th className="px-6 py-3 font-medium text-right">Appointments</th>
                    <th className="px-6 py-3 font-medium text-right">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc, i) => (
                    <tr key={doc.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {i === 0 && doc.revenue > 0 && <span title="Top earner">🏆</span>}
                          <span className="font-medium text-slate-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{doc.department}</td>
                      <td className="px-6 py-3 text-right font-semibold tabular-nums text-slate-900">{money(doc.revenue)}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-600">{doc.invoices}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-600">{doc.appointments}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-600">{doc.visits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}