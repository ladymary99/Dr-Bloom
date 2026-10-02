"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import FinanceOverview from "@/components/FinanceOverview";

type Stats = {
  patients_total: number;
  patients_today: number;
  appointments_today: number;
  appointments_upcoming: number;
  visits_today: number;
  doctors_on_duty: number;
  departments: number;
};

type Appointment = {
  id: string;
  appointment_at: string;
  status: string;
  reason: string | null;
  patient: { mrn: string; first_name: string; last_name: string } | null;
  doctor: { user: { name: string } } | null;
};

const statusPill: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-blue-50 text-blue-700",
  checked_in: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
  no_show: "bg-red-50 text-red-600",
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (today)
    Promise.all([
      api.get("/dashboard/stats"),
      api.get("/appointments", { params: { date } }),
    ])
      .then(([s, a]) => {
        setStats(s.data);
        setToday(a.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { label: "Total patients", value: stats.patients_total, icon: "👥" },
        { label: "Appointments today", value: stats.appointments_today, icon: "📅" },
        { label: "Upcoming", value: stats.appointments_upcoming, icon: "⏳" },
        { label: "Visits today", value: stats.visits_today, icon: "🩺" },
        { label: "Doctors on duty", value: stats.doctors_on_duty, icon: "👨‍⚕️" },
        { label: "Departments", value: stats.departments, icon: "🏥" },
      ]
    : [];

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {greeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening at the hospital today.</p>
        </div>
        <Link
          href="/appointments"
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          View all appointments
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))
          : cards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xl" aria-hidden>{c.icon}</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{c.value}</div>
                <div className="mt-0.5 text-xs text-slate-500">{c.label}</div>
              </div>
            ))}
      </div>

      {/* Today's schedule */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Today&apos;s schedule</h2>
          <span className="text-sm text-slate-500">{today.length} appointments</span>
        </div>
        <FinanceOverview />
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading…</div>
        ) : today.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No appointments today. 🎉</div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {today.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-14 text-sm font-semibold tabular-nums text-slate-900">
                  {formatTime(a.appointment_at)}
                </div>
                <div className="h-9 w-9 flex-none rounded-full bg-slate-200 text-sm font-medium text-slate-700 flex items-center justify-center">
                  {a.patient?.first_name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {a.doctor?.user?.name} · {a.reason || "General visit"}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusPill[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {a.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}