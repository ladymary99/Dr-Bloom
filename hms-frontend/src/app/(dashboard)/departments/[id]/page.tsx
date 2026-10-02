"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

type Detail = {
  department: { id: number; name: string; code: string; description: string | null };
  staff: { id: number; position: string; specialization: string | null; employee_code: string; user: { name: string; email: string } }[];
  stats: { staff_count: number; appointments: number; revenue: number; pending: number; invoices_count: number };
  recent_invoices: { id: number; invoice_number: string; description: string; amount: string; status: string; patient: { first_name: string; last_name: string } | null }[];
};

const invPill: Record<string, string> = { paid: "bg-green-50 text-green-700", pending: "bg-amber-50 text-amber-700", cancelled: "bg-red-50 text-red-600" };

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) api.get(`/departments/${id}`).then((r) => setData(r.data)).catch(() => setError("Could not load department."));
  }, [id]);

  if (error) return <div className="rounded-2xl border border-red-200 bg-white p-12 text-center text-red-600">{error}</div>;
  if (!data) return <div className="p-12 text-center text-slate-500">Loading…</div>;

  const { department, staff, stats, recent_invoices } = data;

  const cards = [
    { label: "Personnel", value: stats.staff_count, icon: "👥" },
    { label: "Appointments", value: stats.appointments, icon: "📅" },
    { label: "Revenue (paid)", value: "$" + Number(stats.revenue).toLocaleString(), icon: "💰" },
    { label: "Pending", value: "$" + Number(stats.pending).toLocaleString(), icon: "⏳" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">🏥</div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{department.name}</h1>
          <p className="text-sm text-slate-500">
            <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs">{department.code}</span>
            {department.description ?? ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xl" aria-hidden>{c.icon}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{c.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Personnel */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Personnel ({staff.length})</h2>
          </div>
          {staff.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No staff assigned.</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700">
                    {s.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{s.user.name}</div>
                    <div className="text-xs text-slate-500">{s.user.email}</div>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${s.position === "doctor" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                      {s.position}
                    </span>
                    <div className="mt-1 text-xs text-slate-400">{s.specialization ?? s.employee_code}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent invoices */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Recent payments ({recent_invoices.length})</h2>
          </div>
          {recent_invoices.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No payments yet.</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recent_invoices.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 px-6 py-3.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-slate-900">{inv.description}</div>
                    <div className="text-xs text-slate-400">{inv.invoice_number} · {inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium tabular-nums text-slate-900">${Number(inv.amount).toLocaleString()}</div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${invPill[inv.status]}`}>{inv.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}