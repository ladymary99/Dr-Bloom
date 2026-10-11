"use client";

/* eslint-disable react-hooks/set-state-in-effect */

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

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

const icons = {
  cash: <svg {...iconProps} className="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1-1.3-1.5-3-1.5s-3 .6-3 1.75c0 2.5 6 1.25 6 3.75 0 1.15-1.3 1.75-3 1.75s-3-.5-3-1.5"/></svg>,
  invoice: <svg {...iconProps} className="h-5 w-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  pending: <svg {...iconProps} className="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  download: <svg {...iconProps} className="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></svg>,
  trophy: <svg {...iconProps} className="h-4 w-4 text-amber-500"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
};

export default function ReportsPage() {
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
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

  useEffect(() => {
    void load(from, to).catch(() => setLoading(false));
  }, [from, to, load]);

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
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Reports Center</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Daily collection and doctor performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30" />
          <span className="text-sm text-[var(--muted)]">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30" />
          <button onClick={() => load(from, to)}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl border border-[var(--border)] bg-white" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-white" />
          <div className="h-56 animate-pulse rounded-3xl border border-[var(--border)] bg-white" />
        </div>
      ) : (
        <>
          {/* Collection summary */}
          {collection && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: `Collected (${collection.from} → ${collection.to})`, value: money(collection.totals.total), icon: icons.cash, tint: "text-[var(--primary)]" },
                { label: "Paid invoices", value: collection.totals.invoices, icon: icons.invoice, tint: "text-[var(--primary)]" },
                { label: "Pending in range", value: money(collection.totals.pending_sum), icon: icons.pending, tint: "text-amber-600" },
              ].map((c) => (
                <div key={c.label} className={`${cardCls} !p-5`}>
                  <span className={c.tint} aria-hidden>{c.icon}</span>
                  <div className="mt-2 font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">{c.value}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Daily collection table + mini bars */}
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
              <h2 className="font-heading font-semibold text-[var(--ink)]">Daily collection</h2>
              <button onClick={() => exportCsv("collection")}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">
                {icons.download} Download Excel
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted)]">
                  <th className="px-6 py-3">Day</th>
                  <th className="px-6 py-3">Trend</th>
                  <th className="px-6 py-3 text-right">Cash</th>
                  <th className="px-6 py-3 text-right">Card</th>
                  <th className="px-6 py-3 text-right">Transfer</th>
                  <th className="px-6 py-3 text-right">Online</th>
                  <th className="px-6 py-3 text-right">Reception</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {collection?.days.map((d) => (
                  <tr key={d.date} className="border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10">
                    <td className="px-6 py-3 font-medium text-[var(--ink)]">{d.label}</td>
                    <td className="px-6 py-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--primary-tint)]/15">
                        <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${(d.total / maxDay) * 100}%` }} />
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--muted)]">{money(d.cash)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--muted)]">{money(d.card)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--muted)]">{money(d.transfer)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--primary)]">{money(d.online)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--muted)]">{money(d.reception)}</td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums text-[var(--ink)]">{money(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Doctor performance */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
              <h2 className="font-heading font-semibold text-[var(--ink)]">Doctor performance ({doctors.length})</h2>
              <button onClick={() => exportCsv("doctors")}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">
                {icons.download} Download Excel
              </button>
            </div>
            {doctors.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
                  <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">No doctors found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted)]">
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Doctor</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3 text-right">Revenue</th>
                    <th className="px-6 py-3 text-right">Invoices</th>
                    <th className="px-6 py-3 text-right">Appointments</th>
                    <th className="px-6 py-3 text-right">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc, i) => (
                    <tr key={doc.id} className="border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10">
                      <td className="px-6 py-3 tabular-nums text-[var(--muted)]">{i + 1}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {i === 0 && doc.revenue > 0 && <span title="Top earner" aria-hidden>{icons.trophy}</span>}
                          <span className="font-medium text-[var(--ink)]">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[var(--muted)]">{doc.department}</td>
                      <td className="px-6 py-3 text-right font-semibold tabular-nums text-[var(--ink)]">{money(doc.revenue)}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-[var(--muted)]">{doc.invoices}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-[var(--muted)]">{doc.appointments}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-[var(--muted)]">{doc.visits}</td>
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