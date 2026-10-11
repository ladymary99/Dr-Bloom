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

const money = (v: number, frac = 0) =>
  "$" + Number(v).toLocaleString(undefined, {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

export default function FinanceOverview() {
  const canView = useAuthStore((s) => s.hasPermission("manage payments"));
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    if (canView) api.get("/admin/finance/summary").then((r) => setData(r.data)).catch(() => {});
  }, [canView]);

  if (!canView) return null;

  const byDept = data?.by_department ?? [];
  const max = Math.max(...byDept.map((d) => Number(d.revenue ?? 0)), 1);
  const paidRate = data
    ? Math.round((data.revenue_total / Math.max(data.revenue_total + data.pending_sum, 1)) * 100)
    : 0;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Finance overview</h2>
        <Link href="/payments" className="text-xs font-medium text-[var(--primary)] hover:underline">
          Open payments →
        </Link>
      </div>

      {/* KPI cards — Total gets a sparkline built from real department data */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total revenue", value: data ? money(data.revenue_total) : null, spark: byDept.map((d) => Number(d.revenue ?? 0)), accent: true },
          { label: "This month", value: data ? money(data.revenue_month) : null, accent: false },
          { label: "Today", value: data ? money(data.revenue_today) : null, accent: false },
        ].map((k) => (
          <div key={k.label} className={`${cardCls} !p-5`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className={`font-heading font-bold tabular-nums text-[var(--ink)] ${k.accent ? "text-3xl" : "text-2xl"}`}>
                  {k.value ?? <span className="inline-block h-8 w-24 animate-pulse rounded bg-[var(--primary-tint)]/20" />}
                </div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{k.label}</div>
              </div>
              {k.spark && k.spark.length > 0 && <Sparkline values={k.spark} />}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue by department — gradient bars with invoice counts */}
        <div className={`${cardCls} lg:col-span-2`}>
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-[var(--ink)]">Revenue by department</h3>
            <span className="text-xs tabular-nums text-[var(--muted)]">{byDept.length} departments</span>
          </div>
          {!data ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 animate-pulse rounded bg-[var(--primary-tint)]/15" />
              ))}
            </div>
          ) : byDept.length === 0 ? (
            <p className="mt-4 py-6 text-center text-sm text-[var(--muted)]">No department revenue data.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {byDept.map((d) => {
                const rev = Number(d.revenue ?? 0);
                return (
                  <div key={d.id} className="group">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--ink)]">{d.name}</span>
                      <span className="text-xs tabular-nums text-[var(--muted)]">
                        {d.invoices_count} invoices ·{" "}
                        <b className="font-semibold text-[var(--ink)]">{money(rev)}</b>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--primary-tint)]/15">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--primary-tint)] to-[var(--primary)] transition-all duration-700 group-hover:to-[var(--primary)]"
                        style={{ width: `${Math.max((rev / max) * 100, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Finance figures + collection rate gauge */}
        <div className={`${cardCls} flex flex-col`}>
          <h3 className="font-heading font-semibold text-[var(--ink)]">Collections</h3>

          <div className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Pending ({data?.pending_count ?? "—"})</span>
              <span className="font-semibold tabular-nums text-amber-600">
                {data ? money(data.pending_sum, 2) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)]">Collected</span>
              <span className="font-semibold tabular-nums text-[var(--ink)]">
                {data ? money(data.revenue_total, 2) : "—"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-1 flex-col items-center justify-center border-t border-[var(--border)]/60 pt-4">
            {!data ? (
              <div className="mt-2 h-28 w-28 animate-pulse rounded-full bg-[var(--primary-tint)]/15" />
            ) : (
              <>
                <Gauge pct={paidRate} />
                <p className="mt-2 text-center text-xs text-[var(--muted)]">
                  <b className="font-semibold text-[var(--ink)]">{paidRate}%</b> of expected income collected
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- mini sparkline bars (real data: per-department revenue) ---------- */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const shown = values.slice(-8);
  return (
    <div className="flex h-10 items-end gap-1">
      {shown.map((value, index) => (
        <span
          key={index}
          className="w-1.5 rounded-t bg-[var(--primary-tint)]"
          style={{ height: `${Math.max((value / max) * 100, 8)}%` }}
        />
      ))}
    </div>
  );
}

function Gauge({ pct }: { pct: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(Math.max(pct, 0), 100) / 100) * circumference;

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-28 w-28 -rotate-90"
      role="img"
      aria-label={`${pct}% of expected income collected`}
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth="8"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        className="transition-all duration-700"
      />
    </svg>
  );
}