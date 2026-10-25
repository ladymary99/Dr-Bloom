"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useT } from "@/lib/i18n";
import { useFetch } from "@/hooks/useFetch";
import { fmtDate, fmtTime } from "@/lib/format";
import { ErrorState, ListSkeleton, PageHeader, StatusBadge, btnGhost, btnPrimary, cardCls } from "@/components/ui";

type Me = {
  patient: { first_name: string; mrn: string };
  profile_completion: number;
  next_appointment: { id: string; appointment_at: string; status: string; visit_type: string; join_url: string | null; doctor?: { user?: { name: string } }; reason: string | null } | null;
  stats: { upcoming: number; past: number; visits: number; prescriptions: number; pending_bills: number; unread_messages: number; new_results: number };
};

export default function PortalHome() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const { data, error, reload } = useFetch<Me>("/portal/me");

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <div className="mx-auto max-w-4xl"><ListSkeleton rows={4} /></div>;

  const s = data.stats;
  const next = data.next_appointment;
  const tiles = [
    { href: "/portal/appointments", label: t("Upcoming"), value: s.upcoming, hint: "appointments" },
    { href: "/portal/messages", label: t("Messages"), value: s.unread_messages, hint: "unread", alert: s.unread_messages > 0 },
    { href: "/portal/records", label: "New results", value: s.new_results, hint: "last 14 days", alert: s.new_results > 0 },
    { href: "/portal/billing", label: "Unpaid bills", value: s.pending_bills, hint: "to pay", alert: s.pending_bills > 0 },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={`${t("Welcome back")}, ${data.patient.first_name ?? user?.name}`} subtitle={`Medical record number ${data.patient.mrn}`}
        actions={<Link href="/portal/book" className={btnPrimary}>{t("Book appointment")}</Link>} />

      <section aria-label={t("Next appointment")} className={`${cardCls} p-6`}>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t("Next appointment")}</h2>
        {next ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-heading text-lg font-semibold">Dr. {next.doctor?.user?.name}</p>
              <p className="text-sm">{fmtDate(next.appointment_at)} · {fmtTime(next.appointment_at)}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]"><StatusBadge status={next.status} />{next.visit_type === "online" ? t("Video visit") : t("In person")}{next.reason ? ` · ${next.reason}` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {next.join_url && <a href={next.join_url} target="_blank" rel="noopener noreferrer" className={btnPrimary}>{t("Join video visit")}</a>}
              <Link href="/portal/appointments" className={btnGhost}>Manage</Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">You have nothing scheduled. Book a visit with one of our doctors.</p><Link href="/portal/book" className={btnPrimary}>{t("Book appointment")}</Link></div>
        )}
      </section>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((x) => (
          <li key={x.href}>
            <Link href={x.href} className={`${cardCls} block p-5 transition hover:-translate-y-0.5 hover:shadow-md ${x.alert ? "ring-2 ring-[var(--primary-tint)]" : ""}`}>
              <p className="text-xs font-semibold text-[var(--muted)]">{x.label}</p>
              <p className="font-heading text-3xl font-semibold text-[var(--primary)]">{x.value}</p>
              <p className="text-xs text-[var(--muted)]">{x.hint}</p>
            </Link>
          </li>
        ))}
      </ul>

      {data.profile_completion < 100 && (
        <section className={`${cardCls} p-6`} aria-label={t("Profile completion")}>
          <div className="mb-2 flex items-center justify-between"><h2 className="font-heading text-sm font-semibold">{t("Profile completion")}</h2><span className="text-sm font-semibold">{data.profile_completion}%</span></div>
          <div role="progressbar" aria-valuenow={data.profile_completion} aria-valuemin={0} aria-valuemax={100} aria-label={t("Profile completion")} className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${data.profile_completion}%` }} /></div>
          <p className="mt-3 text-sm text-[var(--muted)]">Add your allergies, emergency contact and insurance so your care team has what they need before you arrive.</p>
          <Link href="/portal/profile" className={`${btnGhost} mt-3`}>Complete profile</Link>
        </section>
      )}
    </div>
  );
}
