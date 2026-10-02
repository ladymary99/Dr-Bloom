"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Summary = {
  revenue_total: number;
  revenue_month: number;
  revenue_today: number;
  pending_count: number;
  pending_sum: number;
  by_department: { id: number; name: string; revenue: number | null; invoices_count: number }[];
};

export default function FinanceOverview() {
  const canView = useAuthStore((s) => s.hasPermission("manage payments"));
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    if (canView) api.get("/admin/finance/summary").then((r) => setData(r.data)).catch(() => {});
  }, [canView]);

  if (!canView || !data) return null;

  const max = Math.max(...data.by_department.map((d) => Number(d.revenue ?? 0)), 1);

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* Revenue cards */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900">Finance</h2>
        <div className="mt-4 space-y-3">
          {[
            { label: "Total revenue", value: data.revenue_total },
            { label: "This month", value: data.revenue_month },
            { label: "Today", value: data.revenue_today },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{r.label}</span>
              <span className="font-semibold tabular-nums text-slate-900">
                ${Number(r.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-500">Pending ({data.pending_count})</span>
            <span className="font-semibold tabular-nums text-amber-600">
              ${Number(data.pending_sum).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <Link href="/payments" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          Open payments →
        </Link>
      </div>

      {/* Revenue by department */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
        <h2 className="font-semibold text-slate-900">Revenue by department</h2>
        <div className="mt-4 space-y-3">
          {data.by_department.map((d) => {
            const rev = Number(d.revenue ?? 0);
            return (
              <div key={d.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-700">{d.name}</span>
                  <span className="tabular-nums text-slate-500">${rev.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(rev / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}