"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtDate, fmtTime, greetingName } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { useFetch } from "@/hooks/useFetch";
import { useNow } from "@/hooks/useNow";
import StartVisitButton from "@/components/StartVisitButton";
import { EmptyState, ErrorState, ListSkeleton, Notice, StatusBadge, btnGhost, cardCls } from "@/components/ui";

type Appt = {
  id: string; appointment_at: string; duration_minutes: number; status: string; reason: string | null; visit_type: "in_person" | "online";
  meeting_url: string | null; waiting_minutes: number | null; visit_id: string | null; is_overdue: boolean;
  patient: { id: string; mrn: string; name: string; age: number | null; gender: string | null; allergies: string | null } | null;
};
type Home = {
  doctor: { name: string; specialization: string | null };
  today: Appt[]; next: Appt | null;
  tasks: {
    unsigned_notes: { count: number; items: { id: string; appointment_id: string | null; patient: string; visited_at: string }[] };
    labs_to_review: { count: number; items: { id: number; test: string; patient_id: string; patient: string; critical: boolean }[] };
    unread_messages: number; overdue_appointments: number;
  };
  alerts: { critical_labs: { id: number; test: string; patient_id: string; patient: string }[]; waiting_long: Appt[] };
  numbers: { patients_seen_month: number; visits_today: number; no_show_rate: number | null; avg_visit_minutes: number | null };
  inpatients: { id: number; patient_id: string; patient: string; age: number | null; ward: string | null; bed: string | null; days: number; diagnosis: string | null }[];
  activity: { id: number; message: string; link: string | null; at: string; count: number }[];
};

const hello = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export default function DoctorHome() {
  const user = useAuthStore((s) => s.user);
  const { data, error, reload } = useFetch<Home>("/doctor/home");
  const [err, setErr] = useState("");
  const now = useNow();

  // the queue changes during the day: refresh quietly every minute
  useEffect(() => {
    const id = setInterval(reload, 60_000);
    return () => clearInterval(id);
  }, [reload]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <div className="w-full"><ListSkeleton rows={4} /></div>;

  const { next, tasks, alerts, numbers } = data;
  const hasAlerts = alerts.critical_labs.length > 0 || alerts.waiting_long.length > 0;

  async function markNoShow(a: Appt) {
    if (!confirm(`Mark ${a.patient?.name ?? "this patient"} as a no-show?`)) return;
    try { await api.put(`/appointments/${a.id}`, { status: "no_show" }); reload(); } catch (e) { setErr(apiError(e)); }
  }

  return (
    <div className="animate-fade-up w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">{hello()}, {greetingName(user?.name)}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{data.today.length === 0 ? "No appointments today." : `${data.today.filter((a) => !["completed", "cancelled", "no_show"].includes(a.status)).length} of ${data.today.length} appointments still to see today.`}</p>
        </div>
        <p className="rounded-full border border-[var(--border)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--muted)]">{fmtDate(new Date().toISOString())}</p>
      </header>

      {err && <Notice kind="error">{err}</Notice>}

      {hasAlerts && (
        <section aria-label="Alerts" className="space-y-2">
          {alerts.critical_labs.map((l) => (
            <div key={l.id} role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
              <span><b>Critical result:</b> {l.test} for {l.patient} needs your review.</span>
              <Link href={`/patients/${l.patient_id}`} className="font-semibold underline">Open chart</Link>
            </div>
          ))}
          {alerts.waiting_long.map((a) => (
            <div key={a.id} role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span><b>{a.patient?.name}</b> has been waiting {a.waiting_minutes} min.</span>
              {a.patient && <StartVisitButton appointmentId={a.id} patientId={a.patient.id} visitId={a.visit_id} onError={setErr} />}
            </div>
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Next patient */}
          <section aria-label="Next patient" className={`${cardCls} p-6`}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{next?.status === "in_consultation" ? "In consultation now" : "Next patient"}</h2>
            {next && next.patient ? (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-heading text-xl font-semibold text-[var(--ink)]">
                    <Link href={`/patients/${next.patient.id}`} className="hover:underline">{next.patient.name}</Link>
                    <span className="ml-2 text-sm font-normal text-[var(--muted)]">{[next.patient.age !== null ? `${next.patient.age} y` : null, next.patient.gender].filter(Boolean).join(" · ")}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--ink)]">{fmtTime(next.appointment_at)} · {next.duration_minutes} min · {next.visit_type === "online" ? "Video visit" : "In person"}</p>
                  {next.reason && <p className="mt-1 text-sm text-[var(--muted)]">Reason: {next.reason}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={next.status} />
                    {next.waiting_minutes !== null && <span className="text-xs font-semibold text-[var(--muted)]">waiting {next.waiting_minutes} min</span>}
                    {next.patient.allergies && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">⚠ Allergies: {next.patient.allergies}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {next.visit_type === "online" && next.meeting_url && <a href={next.meeting_url} target="_blank" rel="noopener noreferrer" className={btnGhost}>Join video</a>}
                  <StartVisitButton appointmentId={next.id} patientId={next.patient.id} visitId={next.visit_id} onError={setErr} />
                </div>
              </div>
            ) : <p className="text-sm text-[var(--muted)]">Nobody else is waiting. Check the <Link href="/appointments" className="font-medium text-[var(--primary)] underline">appointments</Link> for later today.</p>}
          </section>

          {/* Today */}
          <section aria-label="Today's appointments" className={`${cardCls} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4"><h2 className="font-heading font-semibold text-[var(--ink)]">Today</h2><Link href="/appointments" className="text-xs font-medium text-[var(--primary)] hover:underline">All appointments →</Link></div>
            {data.today.length === 0 ? <div className="p-6"><EmptyState title="Nothing scheduled today" hint="Your booked patients will appear here." /></div> : (
              <ul className="divide-y divide-[var(--border)]/60">
                {data.today.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-6 py-3 text-sm">
                    <span className="w-14 flex-none font-semibold tabular-nums text-[var(--ink)]">{fmtTime(a.appointment_at)}</span>
                    <span className="min-w-0 flex-1">
                      <Link href={a.patient ? `/patients/${a.patient.id}` : "#"} className="font-medium text-[var(--ink)] hover:underline">{a.patient?.name ?? "—"}</Link>
                      <span className="block truncate text-xs text-[var(--muted)]">{[a.patient?.age !== null && a.patient?.age !== undefined ? `${a.patient.age} y` : null, a.reason].filter(Boolean).join(" · ")}</span>
                    </span>
                    <StatusBadge status={a.status} />
                    {a.is_overdue && <span className="text-xs font-semibold text-amber-800">needs update</span>}
                    {a.patient && ["scheduled", "confirmed", "checked_in", "waiting", "in_consultation"].includes(a.status) && (
                      <span className="flex gap-2">
                        <StartVisitButton appointmentId={a.id} patientId={a.patient.id} visitId={a.visit_id} onError={setErr} ghost />
                        {["scheduled", "confirmed"].includes(a.status) && new Date(a.appointment_at).getTime() < now && <button onClick={() => markNoShow(a)} className="text-xs font-medium text-red-700 hover:underline">No-show</button>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.inpatients.length > 0 && (
            <section aria-label="My inpatients" className={`${cardCls} overflow-hidden`}>
              <div className="border-b border-[var(--border)] px-6 py-4"><h2 className="font-heading font-semibold text-[var(--ink)]">My inpatients</h2></div>
              <ul className="divide-y divide-[var(--border)]/60">
                {data.inpatients.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
                    <span><Link href={`/patients/${i.patient_id}`} className="font-medium text-[var(--ink)] hover:underline">{i.patient}</Link><span className="block text-xs text-[var(--muted)]">{[i.ward, i.bed ? `bed ${i.bed}` : null, i.diagnosis].filter(Boolean).join(" · ")}</span></span>
                    <span className="text-xs font-semibold text-[var(--muted)]">day {i.days + 1}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section aria-label="Tasks" className={`${cardCls} p-6`}>
            <h2 className="mb-3 font-heading font-semibold text-[var(--ink)]">To do</h2>
            <ul className="space-y-3 text-sm">
              <TaskRow count={tasks.unsigned_notes.count} label="unsigned visit notes" href={tasks.unsigned_notes.items[0]?.appointment_id ? `/doctor/consult/${tasks.unsigned_notes.items[0].appointment_id}` : undefined}>
                {tasks.unsigned_notes.items.map((n) => <li key={n.id} className="truncate text-xs text-[var(--muted)]">{n.patient}</li>)}
              </TaskRow>
              <TaskRow count={tasks.labs_to_review.count} label="results to review" href={tasks.labs_to_review.items[0] ? `/patients/${tasks.labs_to_review.items[0].patient_id}` : undefined}>
                {tasks.labs_to_review.items.map((l) => <li key={l.id} className="truncate text-xs text-[var(--muted)]">{l.critical && <b className="text-red-700">CRITICAL </b>}{l.test} · {l.patient}</li>)}
              </TaskRow>
              <TaskRow count={tasks.unread_messages} label="unread conversations" href="/messages" />
              <TaskRow count={tasks.overdue_appointments} label="past appointments to update" href="/appointments?when=needs_update" />
            </ul>
            {tasks.unsigned_notes.count + tasks.labs_to_review.count + tasks.unread_messages + tasks.overdue_appointments === 0 && <p className="text-sm text-[var(--muted)]">You&apos;re all caught up.</p>}
          </section>

          <section aria-label="My numbers" className={`${cardCls} p-6`}>
            <h2 className="mb-3 font-heading font-semibold text-[var(--ink)]">My numbers</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Patients seen (month)" value={numbers.patients_seen_month} />
              <Stat label="Visits signed today" value={numbers.visits_today} />
              <Stat label="No-show rate (30 d)" value={numbers.no_show_rate !== null ? `${numbers.no_show_rate}%` : null} />
              <Stat label="Avg visit length (30 d)" value={numbers.avg_visit_minutes !== null ? `${numbers.avg_visit_minutes} min` : null} />
            </dl>
          </section>

          <section aria-label="Recent activity" className={`${cardCls} p-6`}>
            <h2 className="mb-3 font-heading font-semibold text-[var(--ink)]">My recent activity</h2>
            {data.activity.length === 0 ? <p className="text-sm text-[var(--muted)]">Nothing yet.</p> : (
              <ul className="space-y-2 text-sm">
                {data.activity.map((a) => <li key={a.id} className="truncate text-[var(--ink)]">{a.link ? <Link href={a.link} className="hover:underline">{a.message}</Link> : a.message}{a.count > 1 && <span className="ml-1 text-xs font-bold text-[var(--muted)]">×{a.count}</span>}</li>)}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <dt className="text-xs text-[var(--muted)]">{label}</dt>
      <dd className="font-heading text-xl font-semibold text-[var(--ink)]">{value ?? <span className="text-sm font-normal text-[var(--muted)]" title="Not enough data yet">—</span>}</dd>
    </div>
  );
}

function TaskRow({ count, label, href, children }: { count: number; label: string; href?: string; children?: React.ReactNode }) {
  if (count === 0) return null;
  const body = <span className="flex items-baseline gap-2"><b className="font-heading text-lg text-[var(--primary)]">{count}</b><span>{label}</span></span>;
  return (
    <li>
      {href ? <Link href={href} className="block hover:underline">{body}</Link> : body}
      {children && <ul className="mt-1 space-y-0.5 pl-7">{children}</ul>}
    </li>
  );
}
