"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiError, downloadFile, fmtDate, fmtDateTime, fmtShortDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useFetch } from "@/hooks/useFetch";
import { EmptyState, ErrorState, ListSkeleton, Notice, PageHeader, StatusBadge, Tabs, btnGhost, cardCls } from "@/components/ui";

type RxItem = { id: number; medicine_name: string; dosage: string; frequency: string; duration_days: number | null; instructions: string | null };
type Visit = {
  id: string; visited_at: string; type: string; doctor: string | null; specialization: string | null; chief_complaint: string | null;
  diagnosis: string | null; vitals: Record<string, unknown> | null; notes: string | null; hidden: string[];
  prescription: { id: string; status: string; notes: string | null; items: RxItem[] } | null;
};
type Rx = { id: string; status: string; issued_at: string; doctor: string | null; specialization: string | null; visit_date: string | null; diagnosis: string | null; items: RxItem[] };
type Lab = { id: number; test_name: string; category: "lab" | "imaging"; status: string; result: string | null; notes: string | null; released_at: string; has_file: boolean; result_file_name: string | null; doctor?: { user?: { name: string } } | null };
type Vax = { id: string; vaccine_name: string; dose_number: number | null; administered_on: string; next_due_on: string | null; lot_number: string | null; administered_by_user?: unknown; administrator?: { name: string } | null };

type TabId = "visits" | "rx" | "labs" | "vax";

type Query = { data: unknown[] | null; error: string; loading: boolean; reload: () => void };

/** Shared loading / error / empty handling for each tab. */
function Section({ q, children, empty }: { q: Query; children: React.ReactNode; empty: React.ReactNode }) {
  if (q.error) return <ErrorState message={q.error} onRetry={q.reload} />;
  if (q.loading && !q.data) return <ListSkeleton rows={3} />;
  if (!q.data || q.data.length === 0) return <>{empty}</>;
  return <>{children}</>;
}

export default function RecordsPage() {
  const t = useT();
  const [tab, setTab] = useState<TabId>("visits");
  const visits = useFetch<Visit[]>("/portal/records");
  const rx = useFetch<Rx[]>("/portal/prescriptions");
  const labs = useFetch<Lab[]>("/portal/lab-tests");
  const vax = useFetch<Vax[]>("/portal/vaccinations");
  const [fileErr, setFileErr] = useState("");

  async function openFile(l: Lab) {
    setFileErr("");
    try {
      await downloadFile(api, `/portal/lab-tests/${l.id}/file`, l.result_file_name ?? `${l.test_name}.pdf`);
    } catch (e) {
      setFileErr(apiError(e, "Could not download the file."));
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("Medical records")} subtitle="Your visit summaries, prescriptions, results and vaccinations. Doctors choose which notes are shared with you." />
      <div className="mb-4">
        <Tabs label="Medical records" value={tab} onChange={setTab} tabs={[
          { id: "visits", label: t("Visits"), count: visits.data?.length },
          { id: "rx", label: t("Prescriptions"), count: rx.data?.length },
          { id: "labs", label: t("Lab & imaging"), count: labs.data?.length },
          { id: "vax", label: t("Vaccinations"), count: vax.data?.length },
        ]} />
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "visits" && (
          <Section q={visits} empty={<EmptyState title="No visits recorded yet" hint="After your first appointment, the visit summary will appear here." action={{ label: t("Book appointment"), href: "/portal/book" }} />}>
            <ul className="space-y-3">
              {visits.data?.map((v) => (
                <li key={v.id} className={`${cardCls} p-5`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-heading text-base font-semibold">{fmtDate(v.visited_at)}</h2>
                    <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{v.type}</span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">Dr. {v.doctor ?? "—"}{v.specialization ? ` · ${v.specialization}` : ""}</p>
                  <dl className="mt-3 space-y-3 text-sm">
                    {v.chief_complaint && <div><dt className="text-xs font-semibold text-[var(--muted)]">Reason for visit</dt><dd>{v.chief_complaint}</dd></div>}
                    {v.diagnosis && <div><dt className="text-xs font-semibold text-[var(--muted)]">Diagnosis</dt><dd className="whitespace-pre-wrap">{v.diagnosis}</dd></div>}
                    {v.vitals && Object.keys(v.vitals).length > 0 && (
                      <div><dt className="text-xs font-semibold text-[var(--muted)]">Vitals</dt>
                        <dd className="mt-1 flex flex-wrap gap-2">{Object.entries(v.vitals).map(([k, val]) => <span key={k} className="rounded-lg bg-slate-100 px-2 py-1 text-xs"><span className="text-[var(--muted)]">{k.replace(/_/g, " ")}:</span> <strong>{String(val)}</strong></span>)}</dd></div>
                    )}
                    {v.notes && <div><dt className="text-xs font-semibold text-[var(--muted)]">Doctor&apos;s notes</dt><dd className="whitespace-pre-wrap">{v.notes}</dd></div>}
                  </dl>
                  {v.hidden.length > 0 && <p className="mt-3 text-xs text-[var(--muted)]">Your doctor has not shared their {v.hidden.join(", ")} for this visit. Ask them at your next appointment or <Link href="/portal/messages" className="underline">send a message</Link>.</p>}
                  {v.prescription && (
                    <div className="mt-4 rounded-2xl bg-[var(--primary-tint)]/20 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">{t("Prescriptions")}</h3>
                        <Link href={`/portal/prescriptions/${v.prescription.id}`} className="text-xs font-semibold text-[var(--primary)] underline-offset-2 hover:underline">View / {t("Print")}</Link>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm">{v.prescription.items.map((i) => <li key={i.id}><strong>{i.medicine_name}</strong> · {i.dosage}, {i.frequency}{i.duration_days ? ` for ${i.duration_days} days` : ""}</li>)}</ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {tab === "rx" && (
          <Section q={rx} empty={<EmptyState title="No prescriptions yet" hint="Prescriptions written by your doctor will appear here and can be printed for the pharmacy." />}>
            <ul className="space-y-3">
              {rx.data?.map((p) => (
                <li key={p.id} className={`${cardCls} p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-heading text-base font-semibold">{fmtShortDate(p.issued_at)} · Dr. {p.doctor ?? "—"}</h2>
                      <p className="text-xs text-[var(--muted)]">{p.diagnosis ?? p.specialization ?? ""}</p>
                    </div>
                    <div className="flex items-center gap-2"><StatusBadge status={p.status === "dispensed" ? "completed" : "scheduled"} /><span className="sr-only">{p.status}</span>
                      <Link href={`/portal/prescriptions/${p.id}`} className={btnGhost}>View / {t("Print")}</Link></div>
                  </div>
                  <ul className="mt-3 divide-y divide-[var(--border)] text-sm">
                    {p.items.map((i) => <li key={i.id} className="py-2"><strong>{i.medicine_name}</strong> — {i.dosage}, {i.frequency}{i.duration_days ? `, ${i.duration_days} days` : ""}{i.instructions && <span className="block text-xs text-[var(--muted)]">{i.instructions}</span>}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {tab === "labs" && (
          <>
            {fileErr && <div className="mb-3"><Notice kind="error">{fileErr}</Notice></div>}
            <Section q={labs} empty={<EmptyState title="No results to show yet" hint="Lab and imaging results appear here once your care team has reviewed and released them." />}>
              <ul className="space-y-3">
                {labs.data?.map((l) => (
                  <li key={l.id} className={`${cardCls} p-5`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-heading text-base font-semibold">{l.test_name}</h2>
                        <p className="text-xs text-[var(--muted)]">{l.category === "imaging" ? "Imaging" : "Laboratory"} · released {fmtDateTime(l.released_at)}{l.doctor?.user?.name ? ` · ordered by Dr. ${l.doctor.user.name}` : ""}</p>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                    {l.result && <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 font-sans text-sm">{l.result}</pre>}
                    {l.notes && <p className="mt-2 text-xs text-[var(--muted)]">{l.notes}</p>}
                    {l.has_file && <button onClick={() => openFile(l)} className={`${btnGhost} mt-3`}>{t("Download")} {l.result_file_name ?? "report"}</button>}
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}

        {tab === "vax" && (
          <Section q={vax} empty={<EmptyState title="No vaccinations recorded" hint="Vaccines given at our clinic are added to your record by your nurse or doctor." />}>
            <div className={`${cardCls} overflow-x-auto`}>
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">Vaccination history</caption>
                <thead className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><tr>
                  <th scope="col" className="px-5 py-3">Vaccine</th><th scope="col" className="px-3 py-3">Dose</th><th scope="col" className="px-3 py-3">Given</th><th scope="col" className="px-3 py-3">Next due</th><th scope="col" className="px-3 py-3">Lot</th></tr></thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {vax.data?.map((v) => (
                    <tr key={v.id}>
                      <th scope="row" className="px-5 py-3 font-semibold">{v.vaccine_name}</th>
                      <td className="px-3 py-3">{v.dose_number ?? "—"}</td>
                      <td className="px-3 py-3">{fmtShortDate(v.administered_on + "T00:00:00")}</td>
                      <td className="px-3 py-3">{v.next_due_on ? fmtShortDate(v.next_due_on + "T00:00:00") : "—"}</td>
                      <td className="px-3 py-3 text-[var(--muted)]">{v.lot_number ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
