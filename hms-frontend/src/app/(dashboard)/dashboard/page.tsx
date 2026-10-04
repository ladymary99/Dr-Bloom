"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import FinanceOverview from "@/components/FinanceOverview";
import LowStockAlerts from "@/components/LowStockAlerts";

type Trend = { current: number; pct: number; up: boolean };

type Stats = {
  patients_total: number;
  doctors_on_duty: number;
  departments: number;
  appointments_today: number;
  appointments_upcoming: number;
  visits_today: number;
  beds_total: number;
  beds_occupied: number;
  trends: { appointments: Trend; patients: Trend; visits: Trend };
  patient_chart: { label: string; patients: number; visits: number }[];
  upcoming: {
    id: string; appointment_at: string; status: string; reason: string | null;
    patient: { mrn: string; first_name: string; last_name: string } | null;
    doctor: { user: { name: string } } | null;
  }[];
  recent_activity: {
    id: number; action: string; auditable_type: string; created_at: string;
    user: { name: string } | null;
  }[];
};

type StatCard = {
  label: string;
  value: number | string;
  trend?: Trend | null;
  icon?: string;
  href?: string;
};

type TodayAppt = {
  id: string; appointment_at: string; status: string; reason: string | null;
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

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<TodayAppt[]>([]);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    api.get("/settings").then((response) => setAnnouncement(response.data.announcement ?? "")).catch(() => {});
    const date = new Date().toISOString().slice(0, 10);
    Promise.all([
      api.get("/dashboard/stats"),
      api.get("/appointments", { params: { date } }),
    ]).then(([s, a]) => {
      setStats(s.data);
      setToday(a.data.data);
    }).catch(() => {});
  }, []);

  const cards: StatCard[] = stats
    ? [
        { label: "Appointments this week", value: stats.trends.appointments.current, trend: stats.trends.appointments, icon: "📅" },
        { label: "New patients this week", value: stats.trends.patients.current, trend: stats.trends.patients, icon: "🧑‍🤝‍🧑" },
        { label: "Visits this week", value: stats.trends.visits.current, trend: stats.trends.visits, icon: "🩺" },
        { label: "Total patients", value: stats.patients_total, trend: null, icon: "👥" },
        { label: "Room occupancy", value: `${stats.beds_occupied} / ${stats.beds_total}`, href: "/beds", icon: "🛏️" },
      ]
    : [];

  return (
    <div>
      {announcement.trim() && (
        <div role="status" className="mb-6 border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          <div className="font-semibold">Hospital announcement</div>
          <p className="mt-1 whitespace-pre-wrap">{announcement}</p>
        </div>
      )}
      {/* Greeting header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {greeting()}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s everything happening at the hospital — live from your database.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600">
          📅 {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* KPI cards with weekly trends */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xl" aria-hidden>{card.icon}</span>
                {card.trend && (
                  <span className={`text-xs font-medium ${card.trend.up ? "text-green-600" : "text-red-600"}`}>
                    {card.trend.up ? "▲" : "▼"} {card.trend.pct}%
                    <span className="ml-1 font-normal text-slate-400">vs last week</span>
                  </span>
                )}
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{card.value}</div>
              <div className="mt-1 text-xs text-slate-500">{card.label}</div>
            </>
          );

          return card.href ? (
            <Link key={card.label} href={card.href} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              {content}
            </Link>
          ) : (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5">
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Patient statistics chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Patient statistics</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> New patients</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Visits</span>
            </div>
          </div>
          {stats ? <TrendChart data={stats.patient_chart} /> : <div className="h-48 animate-pulse" />}
        </div>

        {/* Right column: today + upcoming */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Today&apos;s schedule</h2>
              <span className="text-xs text-slate-400">{today.length}</span>
            </div>
            <ul className="max-h-56 divide-y divide-slate-50 overflow-y-auto">
              {today.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">Nothing today 🎉</li>}
              {today.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-12 text-xs font-semibold tabular-nums text-slate-900">
                    {new Date(a.appointment_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}
                    </div>
                    <div className="truncate text-xs text-slate-500">{a.doctor?.user?.name}</div>
                  </div>
                  <span className={`h-2 w-2 flex-none rounded-full ${a.status === "completed" ? "bg-green-500" : a.status === "cancelled" ? "bg-red-400" : "bg-blue-500"}`} />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Upcoming</h2>
              <Link href="/appointments" className="text-xs font-medium text-blue-600 hover:underline">View all →</Link>
            </div>
            <ul className="divide-y divide-slate-50">
              {stats?.upcoming.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">No upcoming appointments.</li>}
              {stats?.upcoming.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">
                      {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {new Date(a.appointment_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">{a.doctor?.user?.name} · {a.reason || "Visit"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusPill[a.status]}`}>{a.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Activity + stats strip */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Recent activity</h2>
            <Link href="/admin/audit-logs" className="text-xs font-medium text-blue-600 hover:underline">Full audit log →</Link>
          </div>
          <ul className="divide-y divide-slate-50">
            {stats?.recent_activity.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                <span className={`h-2 w-2 flex-none rounded-full ${
                  ["login_failed", "login_blocked_deactivated", "deleted"].includes(log.action)
                    ? "bg-red-400"
                    : ["created", "login", "created_user"].includes(log.action)
                      ? "bg-green-400"
                      : "bg-blue-400"
                }`} />
                <span className="min-w-0 flex-1 truncate text-slate-700">
                  <b className="font-medium text-slate-900">{log.user?.name ?? "System"}</b>{" "}
                  {log.action.replaceAll("_", " ")}{" "}
                  <span className="text-slate-400">{log.auditable_type.split("\\").pop()}</span>
                </span>
                <span className="flex-none text-xs tabular-nums text-slate-400">{timeAgo(log.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Hospital at a glance</h2>
          <div className="mt-4 space-y-3">
            {stats && [
              { label: "Doctors on duty", value: stats.doctors_on_duty, href: "/admin/users" },
              { label: "Active departments", value: stats.departments, href: "/departments" },
              { label: "Appointments today", value: stats.appointments_today, href: "/appointments" },
              { label: "Waiting upcoming", value: stats.appointments_upcoming, href: "/appointments" },
              { label: "Visits today", value: stats.visits_today, href: null },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{r.label}</span>
                {r.href ? (
                  <Link href={r.href} className="font-semibold tabular-nums text-blue-700 hover:underline">{r.value}</Link>
                ) : (
                  <span className="font-semibold tabular-nums text-slate-900">{r.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Finance + alerts (existing components) */}
      <FinanceOverview />
      <LowStockAlerts />
    </div>
  );
}

/* ---------- SVG line chart (no library needed) ---------- */

function TrendChart({ data }: { data: { label: string; patients: number; visits: number }[] }) {
  const W = 640, H = 190, PAD = 10;
  const max = Math.max(...data.flatMap((d) => [d.patients, d.visits]), 1);
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(data.length - 1, 1);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = (key: "patients" | "visits") => data.map((d, i) => `${x(i)},${y(d[key])}`).join(" ");

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="#f1f5f9" strokeWidth="1" />
        ))}
        <polyline points={pts("visits")} fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pts("patients")} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.patients)} r="3" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
            <text x={x(i)} y={H - 0} fontSize="10" fill="#94a3b8" textAnchor="middle" dominantBaseline="hanging">{d.label}</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 text-right text-xs tabular-nums text-slate-400">peak: {max}</div>
    </div>
  );
}