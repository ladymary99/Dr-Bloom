"use client";

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
  login: "bg-green-50 text-green-700",
  login_failed: "bg-red-50 text-red-600",
  login_blocked_deactivated: "bg-red-50 text-red-600",
  viewed: "bg-slate-100 text-slate-600",
  created: "bg-blue-50 text-blue-700",
  updated: "bg-amber-50 text-amber-700",
  deleted: "bg-red-50 text-red-600",
  created_user: "bg-blue-50 text-blue-700",
  updated_user: "bg-amber-50 text-amber-700",
  reset_user_password: "bg-red-50 text-red-600",
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every action on sensitive data — who, what, when, from where.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Record</th>
                <th className="px-6 py-4 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {result?.data.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 tabular-nums text-slate-600">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-900">{l.user?.name ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${actionPill[l.action] ?? "bg-slate-100 text-slate-600"}`}>
                      {l.action.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {l.auditable_type.split("\\").pop()}
                    <span className="ml-1 text-xs text-slate-400">#{String(l.auditable_id).slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-4 tabular-nums text-slate-500">{l.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {result && result.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <span className="text-sm text-slate-500">Page {result.current_page} of {result.last_page}</span>
            <div className="flex gap-2">
              <button disabled={result.current_page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">← Previous</button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}