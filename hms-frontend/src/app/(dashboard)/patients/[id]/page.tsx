"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDate, fmtShortDateTime, money } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { BreakGlassForm } from "@/components/BreakGlass";
import PatientFiles from "@/components/PatientFiles";
import PatientVaccinations from "@/components/PatientVaccinations";
import VitalsTrend, { type VitalPoint } from "@/components/VitalsTrend";
import { EmptyState, ErrorState, ListSkeleton, Notice, PageHeader, StatusBadge, Tabs, btnGhost, cardCls } from "@/components/ui";

type Code = { code: string; description: string };
type Chart = {
  patient: Record<string, string | number | null> & { id: string; mrn: string; first_name: string; last_name: string; age: number | null };
  access: "care_team" | "break_glass";
  next_appointment: { id: string; appointment_at: string; status: string; reason: string | null; doctor?: { user?: { name: string } } } | null;
  appointments: { id: string; appointment_at: string; status: string; reason: string | null; doctor?: { user?: { name: string } } }[];
  visits: { id: string; visited_at: string; status: "draft" | "signed"; doctor: string | null; mine: boolean; chief_complaint: string | null; diagnosis: string | null; diagnosis_codes: Code[]; letters: { id: string; type: string }[] }[];
  vitals_trend: VitalPoint[];
  prescriptions: { id: string; status: string; issued_at: string; doctor: string | null; diagnosis: string | null; items: { id: number; medicine_name: string; dosage: string; frequency: string; duration_days: number | null }[] }[];
  lab_tests: { id: number; test_name: string; category: string; status: string; result: string | null; is_critical: boolean; released_at: string | null; reviewed_at: string | null; created_at: string; doctor?: { user?: { name: string } } }[];
  admission: { admitted_at: string; bed?: { bed_number: string; ward?: { name: string } } } | null;
  documents_count: number;
  billing: { outstanding: number; paid: number; open_invoices: number } | null;
};
type TabId = "overview" | "visits" | "rx" | "labs" | "vax" | "docs" | "billing";

export default function PatientChartPage() {
  const { id } = useParams<{ id: string }>();
  const roles = useAuthStore((s) => s.roles);
  const canClinical = useAuthStore((s) => s.hasPermission("conduct visits"));
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api.get<Chart>(`/patients/${id}/chart`)
      .then((r) => { if (alive) { setChart(r.data); setRestricted(false); setError(""); } })
      .catch((e) => {
        if (!alive) return;
        const resp = (e as { response?: { status?: number; data?: { code?: string } } }).response;
        if (resp?.status === 403 && resp.data?.code === "access_restricted") setRestricted(true);
        else setError(apiError(e, "Could not open this chart."));
      });
    return () => { alive = false; };
  }, [id, tick]);

  async function labAction(labId: number, action: "review" | "release", released = true) {
    setMsg(null);
    try {
      await api.post(`/lab-tests/${labId}/${action}`, action === "release" ? { released } : undefined);
      setMsg({ kind: "success", text: action === "review" ? "Marked as reviewed." : released ? "Released to the patient." : "Hidden from the patient." });
      setTick((t) => t + 1);
    } catch (e) { setMsg({ kind: "error", text: apiError(e) }); }
  }

  if (restricted) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <PageHeader title="Restricted record" subtitle="This patient is not under your care." />
        <div className={`${cardCls} p-6`}><BreakGlassForm patientId={id} onGranted={() => setTick((t) => t + 1)} /></div>
        <Link href="/patients" className={btnGhost}>← Back to my patients</Link>
      </div>
    );
  }
  if (error) return <div className="mx-auto max-w-xl space-y-4"><ErrorState message={error} onRetry={() => setTick((t) => t + 1)} /><Link href="/patients" className={btnGhost}>← Back to patients</Link></div>;
  if (!chart) return <div className="w-full"><ListSkeleton rows={4} /></div>;

  const p = chart.patient;
  const str = (k: string) => (p[k] === null || p[k] === undefined || p[k] === "" ? null : String(p[k]));
  const unreviewedCritical = chart.lab_tests.filter((l) => l.is_critical && l.status === "completed" && !l.reviewed_at);
  const kv = (label: string, value: string | null) => (
    <div key={label}><dt className="text-xs font-semibold text-[var(--muted)]">{label}</dt><dd className="text-sm text-[var(--ink)]">{value ?? <span className="text-[var(--muted)]">—</span>}</dd></div>
  );

  return (
    <div className="animate-fade-up w-full space-y-5">
      <header className={`${cardCls} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--muted)]"><Link href="/patients" className="underline-offset-2 hover:underline">Patients</Link> / {p.mrn}</p>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">{p.first_name} {p.last_name}</h1>
            <p className="mt-1 text-sm capitalize text-[var(--muted)]">{[p.age !== null ? `${p.age} years` : null, str("gender"), str("blood_type") ? `blood ${p.blood_type}` : null].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {chart.admission && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900">Admitted {fmtShortDate(chart.admission.admitted_at)}{chart.admission.bed?.ward?.name ? ` · ${chart.admission.bed.ward.name}` : ""}</span>}
            <Link href="/messages" className={btnGhost}>Messages</Link>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <p className={`rounded-xl px-3 py-2 ${str("allergies") ? "bg-red-100 text-red-900" : "bg-slate-100 text-slate-700"}`}><b>{str("allergies") ? "⚠ Allergies: " : "Allergies: "}</b>{str("allergies") ?? "none recorded"}</p>
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-slate-800"><b>Conditions: </b>{str("chronic_conditions") ?? "none recorded"}</p>
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-slate-800"><b>Medications: </b>{str("current_medications") ?? "none recorded"}</p>
        </div>
      </header>

      {chart.access === "break_glass" && <Notice kind="warn"><b>Emergency access.</b> You opened this record outside your care team. It is logged and will be reviewed by an administrator. Access ends 4 hours after it was granted.</Notice>}
      {unreviewedCritical.map((l) => <div key={l.id} role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"><span><b>Critical result:</b> {l.test_name} has not been reviewed.</span>{canClinical && <button onClick={() => labAction(l.id, "review")} className={btnGhost}>Mark reviewed</button>}</div>)}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <Tabs label="Patient chart" value={tab} onChange={setTab} tabs={[
        { id: "overview", label: "Overview" }, { id: "visits", label: "Visits", count: chart.visits.length }, { id: "rx", label: "Prescriptions", count: chart.prescriptions.length },
        { id: "labs", label: "Labs & imaging", count: chart.lab_tests.length },
        { id: "vax", label: "Vaccinations" },
        ...((roles.includes("admin") || roles.includes("doctor")) ? [{ id: "docs" as const, label: "Documents", count: chart.documents_count }] : []),
        ...(chart.billing ? [{ id: "billing" as const, label: "Billing" }] : []),
      ]} />

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && (
          <div className="grid gap-5 md:grid-cols-2">
            <section className={`${cardCls} p-6`} aria-label="Details">
              <h2 className="mb-3 font-heading font-semibold">Details</h2>
              <dl className="grid grid-cols-2 gap-3">
                {kv("Date of birth", str("date_of_birth") ? fmtShortDate(String(p.date_of_birth).slice(0, 10) + "T00:00:00") : null)}{kv("Phone", str("phone"))}{kv("Email", str("email"))}{kv("Language", str("preferred_language"))}
                {kv("Address", str("address"))}{kv("Insurance", str("insurance_provider"))}
                {kv("Emergency contact", [str("emergency_contact_name"), str("emergency_contact_relation")].filter(Boolean).join(", ") || null)}{kv("Emergency phone", str("emergency_contact_phone"))}
              </dl>
            </section>
            <section className={`${cardCls} p-6`} aria-label="Appointments">
              <h2 className="mb-3 font-heading font-semibold">Appointments</h2>
              {chart.next_appointment ? <p className="mb-3 rounded-xl bg-[var(--primary-tint)]/20 p-3 text-sm"><b>Next:</b> {fmtShortDateTime(chart.next_appointment.appointment_at)} with Dr. {chart.next_appointment.doctor?.user?.name}<span className="block text-xs text-[var(--muted)]">{chart.next_appointment.reason}</span></p> : <p className="mb-3 text-sm text-[var(--muted)]">Nothing scheduled.</p>}
              <ul className="space-y-1.5 text-sm">{chart.appointments.slice(0, 5).map((a) => <li key={a.id} className="flex items-center justify-between gap-2"><span>{fmtShortDateTime(a.appointment_at)}<span className="text-xs text-[var(--muted)]"> · Dr. {a.doctor?.user?.name}</span></span><StatusBadge status={a.status} /></li>)}</ul>
            </section>
            <section className={`${cardCls} p-6 md:col-span-2`} aria-label="Vitals trend">
              <h2 className="mb-3 font-heading font-semibold">Vitals trend</h2>
              <VitalsTrend points={chart.vitals_trend} />
            </section>
          </div>
        )}

        {tab === "visits" && (chart.visits.length === 0 ? <EmptyState title="No visits yet" hint="Visits appear here once a consultation is started." /> : (
          <ul className="space-y-3">
            {chart.visits.map((v) => (
              <li key={v.id} className={`${cardCls} p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-heading font-semibold">{fmtShortDateTime(v.visited_at)} <span className="text-sm font-normal text-[var(--muted)]">· Dr. {v.doctor}{v.mine ? " (you)" : ""}</span></p>
                    {v.chief_complaint && <p className="text-sm text-[var(--muted)]">{v.chief_complaint}</p>}</div>
                  <div className="flex items-center gap-2"><StatusBadge status={v.status} /><Link href={`/doctor/visit/${v.id}`} className={btnGhost}>{v.status === "draft" && v.mine ? "Resume" : "Open"}</Link></div>
                </div>
                {(v.diagnosis || v.diagnosis_codes.length > 0) && <p className="mt-2 text-sm">{v.diagnosis_codes.map((c) => <span key={c.code} className="mr-2 inline-block rounded-full bg-[var(--primary-tint)]/30 px-2.5 py-0.5 text-xs"><b className="font-mono">{c.code}</b> {c.description}</span>)}{v.diagnosis}</p>}
                {v.letters.length > 0 && <p className="mt-2 text-xs">{v.letters.map((l) => <Link key={l.id} href={`/doctor/letters/${l.id}`} target="_blank" className="mr-3 font-semibold text-[var(--primary)] underline-offset-2 hover:underline">{l.type === "sick_note" ? "Sick note" : "Referral"}</Link>)}</p>}
              </li>
            ))}
          </ul>
        ))}

        {tab === "rx" && (chart.prescriptions.length === 0 ? <EmptyState title="No prescriptions" /> : (
          <ul className="space-y-3">{chart.prescriptions.map((r) => (
            <li key={r.id} className={`${cardCls} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-heading font-semibold">{fmtShortDate(r.issued_at)} <span className="text-sm font-normal text-[var(--muted)]">· Dr. {r.doctor}</span></p><Link href={`/doctor/prescriptions/${r.id}`} target="_blank" className={btnGhost}>Print / PDF</Link></div>
              {r.diagnosis && <p className="text-xs text-[var(--muted)]">{r.diagnosis}</p>}
              <ul className="mt-2 text-sm">{r.items.map((i) => <li key={i.id}><b>{i.medicine_name}</b> · {i.dosage}, {i.frequency}{i.duration_days ? ` · ${i.duration_days} days` : ""}</li>)}</ul>
            </li>))}
          </ul>
        ))}

        {tab === "labs" && (chart.lab_tests.length === 0 ? <EmptyState title="No lab or imaging orders" /> : (
          <ul className="space-y-3">{chart.lab_tests.map((l) => (
            <li key={l.id} className={`${cardCls} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex flex-wrap items-center gap-2 font-heading font-semibold">{l.test_name}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">{l.category}</span><StatusBadge status={l.status} />{l.is_critical && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">CRITICAL</span>}</p>
                {canClinical && l.status === "completed" && (
                  <span className="flex gap-2">
                    {!l.reviewed_at && <button onClick={() => labAction(l.id, "review")} className={btnGhost}>Mark reviewed</button>}
                    <button onClick={() => labAction(l.id, "release", !l.released_at)} className={btnGhost}>{l.released_at ? "Hide from patient" : "Release to patient"}</button>
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)]">ordered {fmtShortDate(l.created_at)}{l.doctor?.user?.name ? ` by Dr. ${l.doctor.user.name}` : ""}{l.released_at ? " · visible to patient" : ""}</p>
              {l.result && <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-sm">{l.result}</pre>}
            </li>))}
          </ul>
        ))}

        {tab === "vax" && <div className={`${cardCls} p-2`}><PatientVaccinations patientId={id} /></div>}
        {tab === "docs" && <div className={`${cardCls} p-6`}><PatientFiles basePath={`/patients/${id}`} canDelete /></div>}
        {tab === "billing" && chart.billing && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`${cardCls} p-5`}><p className="text-xs font-semibold text-[var(--muted)]">Outstanding</p><p className="font-heading text-2xl font-semibold">{money(chart.billing.outstanding)}</p></div>
            <div className={`${cardCls} p-5`}><p className="text-xs font-semibold text-[var(--muted)]">Paid to date</p><p className="font-heading text-2xl font-semibold">{money(chart.billing.paid)}</p></div>
            <div className={`${cardCls} p-5`}><p className="text-xs font-semibold text-[var(--muted)]">Open invoices</p><p className="font-heading text-2xl font-semibold">{chart.billing.open_invoices}</p><Link href="/payments" className="text-xs font-semibold text-[var(--primary)] underline">Go to payments</Link></div>
          </div>
        )}
      </div>
    </div>
  );
}
