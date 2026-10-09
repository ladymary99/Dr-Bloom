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
  icon?: React.ReactNode;
  href?: string;
};

type TodayAppt = {
  id: string; appointment_at: string; status: string; reason: string | null;
  patient: { mrn: string; first_name: string; last_name: string } | null;
  doctor: { user: { name: string } } | null;
};

const statusPill: Record<string, string> = {
  scheduled: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  confirmed: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  checked_in: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
  no_show: "bg-red-100 text-red-600",
};

/* SVG line icons — same style as the rest of the site */
const dashIconProps = {
  className: "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const dashIcons = {
  calendar: <svg {...dashIconProps}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>,
  patients: <svg {...dashIconProps}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  visits: <svg {...dashIconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  users: <svg {...dashIconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  beds: <svg {...dashIconProps}><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20M6 8v9"/></svg>,
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

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
        { label: "Appointments this week", value: stats.trends.appointments.current, trend: stats.trends.appointments, icon: dashIcons.calendar },
        { label: "New patients this week", value: stats.trends.patients.current, trend: stats.trends.patients, icon: dashIcons.patients },
        { label: "Visits this week", value: stats.trends.visits.current, trend: stats.trends.visits, icon: dashIcons.visits },
        { label: "Total patients", value: stats.patients_total, trend: null, icon: dashIcons.users },
        { label: "Room occupancy", value: `${stats.beds_occupied} / ${stats.beds_total}`, href: "/beds", icon: dashIcons.beds },
      ]
    : [];

  return (
    <div className="animate-fade-up">
      {announcement.trim() && (
        <div role="status" className="mb-6 rounded-3xl border border-[var(--primary-tint)]/50 bg-[var(--primary-tint)]/20 px-6 py-4 text-sm text-[var(--primary)]">
          <div className="font-heading font-semibold">Hospital announcement</div>
          <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{announcement}</p>
        </div>
      )}

      {/* Greeting header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">
            {greeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Here&apos;s everything happening at the hospital — live from your database.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-5 py-2 text-sm font-medium text-[var(--muted)] shadow-sm">
          <svg {...dashIconProps} className="h-4 w-4"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
          {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* KPI pills — like the image */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const content = (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[var(--primary)]" aria-hidden>{card.icon}</span>
                {card.trend && (
                  <span className={`text-xs font-semibold ${card.trend.up ? "text-emerald-600" : "text-red-500"}`}>
                    {card.trend.up ? "▲" : "▼"} {card.trend.pct}%
                    <span className="ml-1 font-normal text-[var(--muted)]/70">vs last week</span>
                  </span>
                )}
              </div>
              <div className="mt-4 font-heading text-3xl font-bold tabular-nums text-[var(--ink)]">{card.value}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{card.label}</div>
            </>
          );

          return card.href ? (
            <Link key={card.label} href={card.href} className={`${cardCls} block hover:-translate-y-0.5`}>
              {content}
            </Link>
          ) : (
            <div key={card.label} className={`${cardCls} hover:-translate-y-0.5`}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Patient statistics — gradient area chart */}
        <div className={`${cardCls} xl:col-span-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Patient statistics</h2>
            <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" /> New patients</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--primary-tint)]" /> Visits</span>
            </div>
          </div>
          {stats ? <TrendChart data={stats.patient_chart} /> : <div className="h-48 animate-pulse rounded-2xl bg-[var(--primary-tint)]/10" />}
        </div>

        {/* Right column: today + upcoming */}
        <div className="space-y-6">
          <div className={`${cardCls} !p-0 overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-heading font-semibold text-[var(--ink)]">Today&apos;s schedule</h2>
              <span className="rounded-full bg-[var(--primary-tint)]/25 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--primary)]">{today.length}</span>
            </div>
            <ul className="max-h-56 divide-y divide-[var(--border)]/60 overflow-y-auto">
              {today.length === 0 && <li className="px-5 py-6 text-center text-sm text-[var(--muted)]">Nothing scheduled for today.</li>}
              {today.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--primary-tint)]/10">
                  <div className="w-12 text-xs font-semibold tabular-nums text-[var(--ink)]">
                    {new Date(a.appointment_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--ink)]">
                      {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}
                    </div>
                    <div className="truncate text-xs text-[var(--muted)]">{a.doctor?.user?.name}</div>
                  </div>
                  <span className={`h-2 w-2 flex-none rounded-full ${a.status === "completed" ? "bg-emerald-500" : a.status === "cancelled" ? "bg-red-400" : "bg-[var(--primary)]"}`} />
                </li>
              ))}
            </ul>
          </div>

          <div className={`${cardCls} !p-0 overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="font-heading font-semibold text-[var(--ink)]">Upcoming</h2>
              <Link href="/appointments" className="text-xs font-medium text-[var(--primary)] hover:underline">View all →</Link>
            </div>
            <ul className="divide-y divide-[var(--border)]/60">
              {stats?.upcoming.length === 0 && <li className="px-5 py-6 text-center text-sm text-[var(--muted)]">No upcoming appointments.</li>}
              {stats?.upcoming.map((a) => (
                <li key={a.id} className="px-5 py-3 transition-colors hover:bg-[var(--primary-tint)]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--ink)]">
                      {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}
                    </span>
                    <span className="text-xs tabular-nums text-[var(--muted)]">
                      {new Date(a.appointment_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-[var(--muted)]">{a.doctor?.user?.name} · {a.reason || "Visit"}</span>
                    <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusPill[a.status]}`}>{a.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Activity + at a glance (with occupancy donut) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${cardCls} !p-0 overflow-hidden lg:col-span-2`}>
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="font-heading font-semibold text-[var(--ink)]">Recent activity</h2>
            <Link href="/admin/audit-logs" className="text-xs font-medium text-[var(--primary)] hover:underline">Full audit log →</Link>
          </div>
          <ul className="divide-y divide-[var(--border)]/60">
            {stats?.recent_activity.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-6 py-3 text-sm transition-colors hover:bg-[var(--primary-tint)]/10">
                <span className={`h-2 w-2 flex-none rounded-full ${
                  ["login_failed", "login_blocked_deactivated", "deleted"].includes(log.action)
                    ? "bg-red-400"
                    : ["created", "login", "created_user"].includes(log.action)
                      ? "bg-emerald-400"
                      : "bg-[var(--primary-tint)]"
                }`} />
                <span className="min-w-0 flex-1 truncate text-[var(--muted)]">
                  <b className="font-medium text-[var(--ink)]">{log.user?.name ?? "System"}</b>{" "}
                  {log.action.replaceAll("_", " ")}{" "}
                  <span className="text-[var(--muted)]/70">{log.auditable_type.split("\\").pop()}</span>
                </span>
                <span className="flex-none text-xs tabular-nums text-[var(--muted)]">{timeAgo(log.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={cardCls}>
          <h2 className="font-heading font-semibold text-[var(--ink)]">Hospital at a glance</h2>

          {/* bed occupancy donut */}
          {stats && stats.beds_total > 0 && (
            <div className="mt-4 flex items-center gap-5">
              <Donut occupied={stats.beds_occupied} total={stats.beds_total} />
              <div className="text-sm">
                <div className="font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">
                  {Math.round((stats.beds_occupied / stats.beds_total) * 100)}%
                </div>
                <div className="text-xs text-[var(--muted)]">beds occupied</div>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-5">
            {stats && [
              { label: "Doctors on duty", value: stats.doctors_on_duty, href: "/admin/users" },
              { label: "Active departments", value: stats.departments, href: "/departments" },
              { label: "Appointments today", value: stats.appointments_today, href: "/appointments" },
              { label: "Waiting upcoming", value: stats.appointments_upcoming, href: "/appointments" },
              { label: "Visits today", value: stats.visits_today, href: null },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">{r.label}</span>
                {r.href ? (
                  <Link href={r.href} className="font-semibold tabular-nums text-[var(--primary)] hover:underline">{r.value}</Link>
                ) : (
                  <span className="font-semibold tabular-nums text-[var(--ink)]">{r.value}</span>
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

/* ---------- gradient area chart (pure SVG) ---------- */
function TrendChart({ data }: { data: { label: string; patients: number; visits: number }[] }) {
  const W = 640, H = 190, PAD = 10;
  const max = Math.max(...data.flatMap((d) => [d.patients, d.visits]), 1);
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(data.length - 1, 1);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = (key: "patients" | "visits") => data.map((d, i) => `${x(i)},${y(d[key])}`).join(" ");
  const areaPts = `${PAD},${H - PAD} ${pts("patients")} ${x(data.length - 1)},${H - PAD}`;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B2C2EA" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#B2C2EA" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="#eef1f7" strokeWidth="1" />
        ))}
        <polygon points={areaPts} fill="url(#areaFill)" />
        <polyline points={pts("visits")} fill="none" stroke="#B2C2EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={pts("patients")} fill="none" stroke="#021233" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.patients)} r="3" fill="#021233" stroke="#fff" strokeWidth="1.5" />
            <text x={x(i)} y={H - 0} fontSize="10" fill="#6684b8" textAnchor="middle" dominantBaseline="hanging">{d.label}</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 text-right text-xs tabular-nums text-[var(--muted)]">peak: {max}</div>
    </div>
  );
}

/* ---------- occupancy donut (pure SVG) ---------- */
function Donut({ occupied, total }: { occupied: number; total: number }) {
  const R = 34, CIRC = 2 * Math.PI * R;
  const pct = total > 0 ? occupied / total : 0;
  return (
    <svg viewBox="0 0 84 84" className="h-20 w-20 -rotate-90">
      <circle cx="42" cy="42" r={R} fill="none" stroke="#e8edf6" strokeWidth="9" />
      <circle
        cx="42" cy="42" r={R} fill="none"
        stroke="#021233" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${CIRC * pct} ${CIRC}`}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}