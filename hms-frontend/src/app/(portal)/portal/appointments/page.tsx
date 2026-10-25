"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { addDays, apiError, downloadFile, fmtDate, fmtDateTime, fmtTime, money, todayStr, wallDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useFetch } from "@/hooks/useFetch";
import { EmptyState, ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, StatusBadge, Tabs, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Appt = {
  id: string; doctor_id: number; appointment_at: string; status: string; reason: string | null; visit_type: "in_person" | "online";
  duration_minutes: number; can_modify: boolean; cutoff_hours: number; join_url: string | null;
  doctor?: { user?: { name: string }; specialization?: string | null } | null;
  invoice?: { id: number; invoice_number: string; status: string; amount: string; amount_paid: string } | null;
};

export default function AppointmentsPage() {
  const t = useT();
  const { data, error, loading, reload } = useFetch<Appt[]>("/portal/appointments");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelTarget, setCancelTarget] = useState<Appt | null>(null);
  const [moveTarget, setMoveTarget] = useState<Appt | null>(null);
  const [flash, setFlash] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // refreshed every minute so "upcoming" stays correct on a long-open tab, without calling Date.now() during render
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const isUpcoming = (a: Appt) => new Date(a.appointment_at).getTime() >= now - a.duration_minutes * 60_000 && ["scheduled", "confirmed", "checked_in"].includes(a.status);
  const upcoming = (data ?? []).filter(isUpcoming).sort((a, b) => a.appointment_at.localeCompare(b.appointment_at));
  const past = (data ?? []).filter((a) => !isUpcoming(a));

  async function ics(a: Appt) {
    try {
      await downloadFile(api, `/portal/appointments/${a.id}/ics`, "appointment.ics");
    } catch {
      setFlash({ kind: "error", text: "Could not create the calendar file." });
    }
  }

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("Appointments")} actions={<Link href="/portal/book" className={btnPrimary}>{t("Book appointment")}</Link>} />
      {flash && <div className="mb-4"><Notice kind={flash.kind}>{flash.text}</Notice></div>}

      <div className="mb-4">
        <Tabs label="Appointments" value={tab} onChange={setTab} tabs={[{ id: "upcoming", label: t("Upcoming"), count: upcoming.length }, { id: "past", label: t("Past") }]} />
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {error ? <ErrorState message={error} onRetry={reload} />
          : loading && !data ? <ListSkeleton rows={3} />
          : list.length === 0 ? (
            tab === "upcoming"
              ? <EmptyState title="No upcoming appointments" hint="Book a visit with one of our doctors in a few clicks." action={{ label: t("Book appointment"), href: "/portal/book" }} />
              : <EmptyState title="No past appointments yet" hint="Completed, cancelled and missed visits will be listed here." />
          ) : (
            <ul className="space-y-3">
              {list.map((a) => {
                const name = a.doctor?.user?.name ?? "Doctor";
                const open = ["scheduled", "confirmed"].includes(a.status) && tab === "upcoming";
                return (
                  <li key={a.id} className={`${cardCls} p-5`}>
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="w-16 flex-none rounded-2xl bg-[var(--primary-tint)]/30 py-2 text-center">
                        <div className="text-[11px] font-semibold uppercase text-[var(--muted)]">{wallDate(a.appointment_at.slice(0, 10)).toLocaleDateString(undefined, { month: "short" })}</div>
                        <div className="font-heading text-2xl font-semibold leading-none text-[var(--primary)]">{a.appointment_at.slice(8, 10)}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-heading text-base font-semibold">Dr. {name}</h2>
                          <StatusBadge status={a.status} />
                          {a.visit_type === "online" && <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900">{t("Video visit")}</span>}
                        </div>
                        <p className="text-sm text-[var(--muted)]">{fmtDate(a.appointment_at)} · {fmtTime(a.appointment_at)} · {a.duration_minutes} min</p>
                        {a.doctor?.specialization && <p className="text-xs text-[var(--muted)]">{a.doctor.specialization}</p>}
                        {a.reason && <p className="mt-1 text-sm text-[var(--ink)]">“{a.reason}”</p>}
                        {a.invoice && (
                          <p className="mt-1 text-xs">
                            <Link href="/portal/billing" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">{a.invoice.invoice_number}</Link>
                            {" · "}{money(a.invoice.amount)} · <StatusBadge status={a.invoice.status} />
                          </p>
                        )}
                      </div>
                    </div>

                    {tab === "upcoming" && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                        {a.join_url && <a href={a.join_url} target="_blank" rel="noopener noreferrer" className={btnPrimary}>{t("Join video visit")}</a>}
                        <button onClick={() => ics(a)} className={btnGhost}>{t("Add to calendar")}</button>
                        {open && (a.can_modify ? (
                          <>
                            <button onClick={() => setMoveTarget(a)} className={btnGhost}>{t("Reschedule")}</button>
                            <button onClick={() => setCancelTarget(a)} className={btnDanger}>{t("Cancel")}</button>
                          </>
                        ) : (
                          <p className="self-center text-xs text-[var(--muted)]">
                            Changes are closed within {a.cutoff_hours} h of the visit. Please call the clinic or send a <Link href="/portal/messages" className="underline">message</Link>.
                          </p>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </div>

      <CancelModal appt={cancelTarget} onClose={() => setCancelTarget(null)} onDone={(msg) => { setCancelTarget(null); setFlash({ kind: "success", text: msg }); reload(); }} />
      <RescheduleModal appt={moveTarget} onClose={() => setMoveTarget(null)} onDone={(msg) => { setMoveTarget(null); setFlash({ kind: "success", text: msg }); reload(); }} />
    </div>
  );
}

function CancelModal({ appt, onClose, onDone }: { appt: Appt | null; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    // reset the form every time the dialog opens for a (new) appointment
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReason(""); setErr("");
  }, [appt?.id]);

  async function go() {
    if (!appt) return;
    setBusy(true); setErr("");
    try {
      await api.put(`/portal/appointments/${appt.id}/cancel`, { reason: reason.trim() || undefined });
      onDone("Your appointment was cancelled. The time is now free for other patients.");
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={!!appt} onClose={onClose} title="Cancel appointment"
      footer={<><button onClick={onClose} className={btnGhost}>Keep appointment</button><button onClick={go} disabled={busy} className={btnDanger}>{busy ? "Cancelling…" : "Yes, cancel it"}</button></>}>
      {appt && (
        <div className="space-y-4">
          <p className="text-sm">Cancel your visit with <strong>Dr. {appt.doctor?.user?.name}</strong> on <strong>{fmtDateTime(appt.appointment_at)}</strong>?</p>
          {appt.invoice && appt.invoice.status === "pending" && <Notice kind="info">The unpaid invoice {appt.invoice.invoice_number} will be voided.</Notice>}
          <Field label="Reason (optional)">{(p) => <textarea {...p} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} data-autofocus />}</Field>
          {err && <Notice kind="error">{err}</Notice>}
          <span className="sr-only">{t("Cancel")}</span>
        </div>
      )}
    </Modal>
  );
}

function RescheduleModal({ appt, onClose, onDone }: { appt: Appt | null; onClose: () => void; onDone: (m: string) => void }) {
  const [days, setDays] = useState<Record<string, string[]> | null>(null);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState("");

  const load = useCallback(async () => {
    if (!appt) return;
    setDays(null); setLoadErr("");
    try {
      // `ignore` hides this appointment's own slot from "busy" so the patient can pick nearby times
      const { data } = await api.get(`/portal/doctors/${appt.doctor_id}/slots`, { params: { from: todayStr(), to: addDays(todayStr(), 27), ignore: appt.id } });
      setDays(data.days);
      setDay(Object.keys(data.days)[0] ?? "");
      setTime("");
    } catch (e) {
      setLoadErr(apiError(e));
    }
  }, [appt]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function go() {
    if (!appt || !day || !time) return;
    setBusy(true); setErr("");
    try {
      await api.put(`/portal/appointments/${appt.id}/reschedule`, { slot: `${day} ${time}` });
      onDone(`Moved to ${fmtDateTime(`${day}T${time}:00`)}. We've notified the doctor.`);
    } catch (e) {
      setErr(apiError(e));
      load();
    } finally {
      setBusy(false);
    }
  }

  const keys = Object.keys(days ?? {});
  return (
    <Modal open={!!appt} onClose={onClose} title="Reschedule appointment" wide
      footer={<><button onClick={onClose} className={btnGhost}>Close</button><button onClick={go} disabled={!time || busy} className={btnPrimary}>{busy ? "Saving…" : "Confirm new time"}</button></>}>
      {appt && (
        <div className="space-y-4">
          <p className="text-sm">Currently <strong>{fmtDateTime(appt.appointment_at)}</strong> with Dr. {appt.doctor?.user?.name}.</p>
          {loadErr ? <ErrorState message={loadErr} onRetry={load} />
            : !days ? <ListSkeleton rows={1} />
            : keys.length === 0 ? <EmptyState title="No other free times in the next 4 weeks" hint="Send the clinic a message and we'll help you find a time." />
            : (
              <>
                <div role="radiogroup" aria-label="Date" className="flex gap-2 overflow-x-auto pb-1">
                  {keys.map((k) => {
                    const d = wallDate(k);
                    return (
                      <button key={k} role="radio" aria-checked={k === day} onClick={() => { setDay(k); setTime(""); }}
                        className={`flex w-16 flex-none flex-col items-center rounded-2xl border px-2 py-2 ${k === day ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white"}`}>
                        <span className="text-[11px] opacity-80">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                        <span className="font-heading text-lg font-semibold">{d.getDate()}</span>
                        <span className="text-[11px] opacity-80">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                      </button>
                    );
                  })}
                </div>
                <div role="radiogroup" aria-label="Time" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(days[day] ?? []).map((x) => (
                    <button key={x} role="radio" aria-checked={x === time} onClick={() => setTime(x)}
                      className={`rounded-xl border px-2 py-2 text-sm font-medium tabular-nums ${x === time ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:border-[var(--primary)]"}`}>{x}</button>
                  ))}
                </div>
              </>
            )}
          {err && <Notice kind="error">{err}</Notice>}
        </div>
      )}
    </Modal>
  );
}

