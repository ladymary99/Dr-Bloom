"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Log = {
  id: number;
  action: string;
  auditable_type: string;
  auditable_id: string;
  ip_address: string | null;
  created_at: string;
  user: { name: string } | null;
};

type Paginated = { data: Log[]; current_page: number; last_page: number; total: number };

const actionPill: Record<string, string> = {
  login: "bg-emerald-100 text-emerald-700",
  login_failed: "bg-red-100 text-red-600",
  login_blocked_deactivated: "bg-red-100 text-red-600",
  viewed: "bg-[var(--primary-tint)]/15 text-[var(--muted)]",
  created: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  updated: "bg-amber-100 text-amber-700",
  deleted: "bg-red-100 text-red-600",
  created_user: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  updated_user: "bg-amber-100 text-amber-700",
  reset_user_password: "bg-red-100 text-red-600",
};

export default function AuditLogsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const { data } = await api.get("/admin/audit-logs", { params: { page: p } });
    setResult(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Audit Logs</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every action on sensitive data — who, what, when, from where.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        {loading ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Record</th>
                <th className="px-6 py-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]/60 last:border-0">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 animate-pulse rounded bg-[var(--primary-tint)]/20" style={{ width: `${50 + ((i * 7 + j * 13) % 35)}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Record</th>
                <th className="px-6 py-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {result?.data.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10">
                  <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[var(--muted)]">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-[var(--ink)]">{l.user?.name ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${actionPill[l.action] ?? "bg-[var(--primary-tint)]/15 text-[var(--muted)]"}`}>
                      {l.action.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--muted)]">
                    {l.auditable_type.split("\\").pop()}
                    <span className="ml-1 text-xs tabular-nums text-[var(--muted)]/60">#{String(l.auditable_id).slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-4 tabular-nums text-[var(--muted)]">{l.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {result && result.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
            <span className="text-sm tabular-nums text-[var(--muted)]">Page {result.current_page} of {result.last_page}</span>
            <div className="flex gap-2">
              <button disabled={result.current_page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]">← Previous</button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}