"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Stats = {
  low_stock_count: number;
  low_stock_items: {
    id: number; item_name: string; quantity: number;
    min_level: number; unit: string | null;
    department: { name: string } | null;
  }[];
};

export default function LowStockAlerts() {
  const canView = useAuthStore((s) => s.hasPermission("manage departments"));
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (canView) api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
  }, [canView]);

  if (!canView || !stats || stats.low_stock_count === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-white">
      <div className="flex items-center justify-between border-b border-amber-100 px-6 py-4">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          ⚠️ Low stock alerts
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">{stats.low_stock_count} items</span>
        </h2>
        <span className="text-xs text-slate-400">Departments need to reorder these</span>
      </div>
      <ul className="divide-y divide-slate-50">
        {stats.low_stock_items.map((it) => (
          <li key={it.id} className="flex items-center gap-4 px-6 py-3.5 text-sm">
            <span className="text-lg">📦</span>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-slate-900">{it.item_name}</span>
              <span className="ml-2 text-xs text-slate-400">{it.department?.name ?? "—"}</span>
            </div>
            <span className="tabular-nums text-slate-600">
              <b className="text-red-600">{it.quantity}</b> / {it.min_level} {it.unit}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-amber-100 px-6 py-3">
        <Link href="/departments" className="text-sm font-medium text-blue-600 hover:underline">
          Open departments to manage inventory →
        </Link>
      </div>
    </div>
  );
}