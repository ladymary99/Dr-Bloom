"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { addDays, apiError, fmtShortDate, fmtShortDateTime, fmtTime, todayStr, wallDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import BookAppointmentModal from "@/components/BookAppointmentModal";
import StartVisitButton from "@/components/StartVisitButton";
import { EmptyState, ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, StatusBadge, Tabs, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Appt = {
  id: string; appointment_at: string; duration_minutes: number; status: string; reason: string | null; visit_type: "in_person" | "online"; is_overdue: boolean; doctor_id: number;
  patient: { id: string; mrn: string; first_name: string; last_name: string; date_of_birth?: string; gender?: string } | null;
  doctor?: { user?: { name: string } } | null; department?: { name: string } | null;
};
type Page = { data: Appt[]; current_page: number; last_page: number; total: number; counts: Record<"upcoming" | "today" | "past" | "needs_update" | "all", number> };
type When = "upcoming" | "today" | "past" | "needs_update" | "all";

const ageOf = (dob?: string) => (dob ? `${Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10)} y` : "");
const OPEN = ["scheduled", "confirmed"];

export default function AppointmentsPage() {
  const roles = useAuthStore((s) => s.roles);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canBook = hasPermission("manage appointments");
  const isDoctor = roles.includes("doctor") && !roles.includes("admin");
  const frontDesk = roles.includes("admin") || roles.includes("receptionist");

  const [when, setWhen] = useState<When>("upcoming");
  const [view, setView] = useState<"list" | "day">("list");
  const [day, setDay] = useState(todayStr);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [book, setBook] = useState(false);
  const [cancelling, setCancelling] = useState<Appt | null>(null);
  const [moving, setMoving] = useState<Appt | null>(null);
  const [bulk, setBulk] = useState<null | "no_show" | "completed">(null);
  const seq = useRef(0);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const params = view === "day" ? { when: "all", date: day, per: 100 } : { when, status: status || undefined, search: debounced || undefined, page };
      const { data } = await api.get<Page>("/appointments", { params: { ...params, search: debounced || undefined } });
      if (id === seq.current) { setResult(data); setError(""); }
    } catch (e) { if (id === seq.current) setError(apiError(e, "Could not load appointments.")); }
    finally { if (id === seq.current) setLoading(false); }
  }, [when, view, day, status, debounced, page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and whenever a filter changes
  useEffect(() => { load(); }, [load]);

  async function setAppt(a: Appt, patch: Record<string, unknown>, ok: string) {
    setMsg(null);
    try { await api.put(`/appointments/${a.id}`, patch); setMsg({ kind: "success", text: ok }); load(); }
    catch (e) { setMsg({ kind: "error", text: apiError(e) }); }
  }

  async function resolveAll(status: "no_show" | "completed") {
    try { const { data } = await api.post("/appointments/resolve-stale", { status }); setBulk(null); setMsg({ kind: "success", text: `${data.updated} past appointment(s) updated.` }); setPage(1); load(); }
    catch (e) { setBulk(null); setMsg({ kind: "error", text: apiError(e) }); }
  }

  const c = result?.counts;
  const tabs: { id: When; label: string; count?: number }[] = [
    { id: "upcoming", label: "Upcoming", count: c?.upcoming }, { id: "today", label: "Today", count: c?.today }, { id: "past", label: "Past" },
    { id: "needs_update", label: "Needs update", count: c?.needs_update }, { id: "all", label: "All" },
  ];

  return (
    <div className="animate-fade-up w-full">
      <PageHeader title="Appointments" subtitle={result ? `${result.total} shown` : "Loading…"}
        actions={<>
          <div role="group" aria-label="View" className="inline-flex rounded-full border border-[var(--border)] bg-white p-1">
            {(["list", "day"] as const).map((v) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-full px-4 py-1 text-sm font-medium ${view === v ? "bg-[var(--primary)] text-white" : "text-[var(--muted)]"}`}>{v === "list" ? "List" : "Day calendar"}</button>)}
          </div>
          {canBook && <button onClick={() => setBook(true)} className={btnPrimary}>+ Book appointment</button>}
        </>} />

      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

      {view === "list" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1"><Tabs label="Appointments" value={when} onChange={(v) => { setWhen(v); setPage(1); }} tabs={tabs} /></div>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label htmlFor="ap-search" className="sr-only">Search patient</label>
            <input id="ap-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient name or MRN…" className="w-64 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm focus:border-[var(--primary)] focus:outline-none" />
            <label htmlFor="ap-status" className="sr-only">Status</label>
            <select id="ap-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm">
              <option value="">Any status</option>{["scheduled", "confirmed", "checked_in", "waiting", "in_consultation", "completed", "cancelled", "no_show"].map((s) => <option key={s} value={s}>{s === "scheduled" ? "Pending" : s.replace(/_/g, " ")}</option>)}
            </select>
            {when === "needs_update" && frontDesk && (c?.needs_update ?? 0) > 0 && (
              <span className="ml-auto flex gap-2"><button onClick={() => setBulk("no_show")} className={btnGhost}>Mark all as no-show…</button><button onClick={() => setBulk("completed")} className={btnGhost}>Mark all as completed…</button></span>
            )}
          </div>
          {when === "needs_update" && <div className="mb-4"><Notice kind="warn">These appointments are over but were never closed. Check what happened before choosing: &ldquo;no-show&rdquo; and &ldquo;completed&rdquo; both affect reports and the patient&apos;s record.</Notice></div>}

          {error ? <ErrorState message={error} onRetry={load} />
            : loading && !result ? <ListSkeleton rows={5} />
            : !result?.data.length ? <EmptyState title={when === "needs_update" ? "Everything is up to date" : "No appointments here"} hint={when === "upcoming" ? "Nothing booked from today onward." : "Try another tab or clear the search."} />
            : (
              <div className={`${cardCls} overflow-x-auto ${loading ? "opacity-60" : ""}`}>
                <table className="w-full min-w-[56rem] text-sm">
                  <caption className="sr-only">Appointments</caption>
                  <thead><tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                    <th scope="col" className="px-5 py-3">When</th><th scope="col" className="px-3 py-3">Patient</th><th scope="col" className="px-3 py-3">Reason</th>{!isDoctor && <th scope="col" className="px-3 py-3">Doctor</th>}<th scope="col" className="px-3 py-3">Status</th><th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody className="divide-y divide-[var(--border)]/60">
                    {result.data.map((a) => (
                      <tr key={a.id} className={a.is_overdue ? "bg-amber-50/60" : "hover:bg-[var(--primary-tint)]/10"}>
                        <td className="px-5 py-3"><div className="font-medium tabular-nums">{fmtShortDate(a.appointment_at)}</div><div className="text-xs tabular-nums text-[var(--muted)]">{fmtTime(a.appointment_at)} · {a.duration_minutes} min{a.visit_type === "online" ? " · video" : ""}</div></td>
                        <td className="px-3 py-3">{a.patient ? <Link href={`/patients/${a.patient.id}`} className="font-medium hover:underline">{a.patient.first_name} {a.patient.last_name}</Link> : "—"}<div className="text-xs text-[var(--muted)]">{[ageOf(a.patient?.date_of_birth), a.patient?.mrn].filter(Boolean).join(" · ")}</div></td>
                        <td className="max-w-[14rem] truncate px-3 py-3 text-[var(--muted)]" title={a.reason ?? ""}>{a.reason ?? "—"}</td>
                        {!isDoctor && <td className="px-3 py-3 text-[var(--muted)]">{a.doctor?.user?.name ?? "—"}<div className="text-xs">{a.department?.name}</div></td>}
                        <td className="px-3 py-3"><StatusBadge status={a.status} />{a.is_overdue && <div className="mt-1 text-[11px] font-semibold text-amber-800">needs update</div>}</td>
                        <td className="px-5 py-3"><div className="flex flex-wrap items-center justify-end gap-2">
                          {a.is_overdue ? (<>
                            <button onClick={() => setAppt(a, { status: "completed" }, "Marked completed.")} className="text-xs font-semibold text-emerald-800 hover:underline">Completed</button>
                            <button onClick={() => { if (confirm("Mark this appointment as a no-show?")) setAppt(a, { status: "no_show" }, "Marked no-show."); }} className="text-xs font-semibold text-red-700 hover:underline">No-show</button>
                          </>) : (<>
                            {a.status === "scheduled" && <button onClick={() => setAppt(a, { status: "confirmed" }, "Confirmed. The patient was notified.")} className="text-xs font-semibold text-[var(--primary)] hover:underline">Confirm</button>}
                            {OPEN.includes(a.status) && <button onClick={() => setAppt(a, { status: "checked_in" }, "Checked in.")} className="text-xs font-semibold text-[var(--primary)] hover:underline">Check in</button>}
                            {OPEN.includes(a.status) && <button onClick={() => setMoving(a)} className="text-xs font-semibold text-[var(--primary)] hover:underline">Reschedule</button>}
                            {isDoctor && a.patient && ["scheduled", "confirmed", "checked_in", "waiting", "in_consultation"].includes(a.status) && <StartVisitButton appointmentId={a.id} patientId={a.patient.id} ghost onError={(t) => setMsg({ kind: "error", text: t })} />}
                            {OPEN.includes(a.status) && <button onClick={() => setCancelling(a)} className="text-xs font-semibold text-red-700 hover:underline">Cancel</button>}
                          </>)}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.last_page > 1 && (
                  <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-sm"><span className="tabular-nums text-[var(--muted)]">Page {result.current_page} of {result.last_page}</span>
                    <span className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className={btnGhost}>← Previous</button><button disabled={page === result.last_page} onClick={() => setPage(page + 1)} className={btnGhost}>Next →</button></span></div>
                )}
              </div>
            )}
        </>
      ) : (
        <DayCalendar day={day} setDay={setDay} items={result?.data ?? []} loading={loading} error={error} reload={load} />
      )}

      <BookAppointmentModal open={book} onClose={() => setBook(false)} onBooked={() => { setBook(false); setMsg({ kind: "success", text: "Appointment booked. The patient was notified." }); setPage(1); load(); }} />
      <CancelDialog appt={cancelling} onClose={() => setCancelling(null)} onDone={(t) => { setCancelling(null); setMsg({ kind: "success", text: t }); load(); }} />
      <MoveDialog appt={moving} onClose={() => setMoving(null)} onDone={(t) => { setMoving(null); setMsg({ kind: "success", text: t }); load(); }} />
      <Modal open={!!bulk} onClose={() => setBulk(null)} title={bulk === "no_show" ? "Mark all as no-show?" : "Mark all as completed?"}
        footer={<><button onClick={() => setBulk(null)} className={btnGhost}>Cancel</button><button onClick={() => bulk && resolveAll(bulk)} className={btnDanger}>Yes, update {c?.needs_update}</button></>}>
        <p className="text-sm">This changes <b>{c?.needs_update}</b> past appointment(s) to <b>{bulk === "no_show" ? "no-show" : "completed"}</b>. Appointments with an unsigned visit note are left alone. It is recorded in the audit log and cannot be undone in bulk.</p>
      </Modal>
    </div>
  );
}

function CancelDialog({ appt, onClose, onDone }: { appt: Appt | null; onClose: () => void; onDone: (t: string) => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form for each appointment
  useEffect(() => { setReason(""); setErr(""); }, [appt?.id]);
  async function go() {
    if (!appt) return;
    setBusy(true);
    try { await api.put(`/appointments/${appt.id}`, { status: "cancelled", cancellation_reason: reason || undefined }); onDone("Appointment cancelled. The patient was notified and the time is free again."); }
    catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal open={!!appt} onClose={onClose} title="Cancel this appointment?" footer={<><button onClick={onClose} className={btnGhost}>Keep it</button><button onClick={go} disabled={busy} className={btnDanger}>{busy ? "Cancelling…" : "Cancel appointment"}</button></>}>
      {appt && <div className="space-y-3 text-sm"><p><b>{appt.patient?.first_name} {appt.patient?.last_name}</b> · {fmtShortDateTime(appt.appointment_at)} · {appt.doctor?.user?.name}</p><Field label="Reason (optional)">{(p) => <input {...p} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />}</Field>{err && <Notice kind="error">{err}</Notice>}</div>}
    </Modal>
  );
}

function MoveDialog({ appt, onClose, onDone }: { appt: Appt | null; onClose: () => void; onDone: (t: string) => void }) {
  const roles = useAuthStore((s) => s.roles);
  const canOverride = roles.includes("admin") || roles.includes("receptionist");
  const [days, setDays] = useState<Record<string, string[]> | null>(null);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [override, setOverride] = useState(false);
  const [free, setFree] = useState("");
  const [why, setWhy] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the dialog for each appointment
    setDays(null); setTime(""); setErr(""); setOverride(false);
    api.get(`/appointment-slots/${appt.doctor_id}`, { params: { from: todayStr(), to: addDays(todayStr(), 27), ignore: appt.id } })
      .then(({ data }) => { setDays(data.days); setDay(Object.keys(data.days)[0] ?? ""); }).catch((e) => setErr(apiError(e)));
  }, [appt]);

  async function go() {
    if (!appt) return;
    setBusy(true); setErr("");
    const at = override ? `${free}:00` : `${day}T${time}:00`;
    try { await api.put(`/appointments/${appt.id}`, { appointment_at: at, override: override || undefined, override_reason: override ? why : undefined }); onDone("Appointment moved. The patient was notified."); }
    catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  }
  const keys = Object.keys(days ?? {});
  return (
    <Modal open={!!appt} onClose={onClose} title="Reschedule" wide footer={<><button onClick={onClose} className={btnGhost}>Close</button><button onClick={go} disabled={busy || (override ? !free || why.trim().length < 5 : !time)} className={btnPrimary}>{busy ? "Saving…" : "Move appointment"}</button></>}>
      {appt && (
        <div className="space-y-4">
          <p className="text-sm">{appt.patient?.first_name} {appt.patient?.last_name} · currently <b>{fmtShortDateTime(appt.appointment_at)}</b> with {appt.doctor?.user?.name}</p>
          {!override && (!days ? <p className="text-sm text-[var(--muted)]">Loading free times…</p> : keys.length === 0 ? <Notice kind="warn">No free times in the next 4 weeks.</Notice> : (
            <>
              <div role="radiogroup" aria-label="Date" className="flex gap-2 overflow-x-auto pb-1">{keys.map((k) => { const d = wallDate(k); return <button key={k} type="button" role="radio" aria-checked={k === day} onClick={() => { setDay(k); setTime(""); }} className={`w-16 flex-none rounded-2xl border px-2 py-2 text-center ${k === day ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white"}`}><span className="block text-[11px] opacity-80">{d.toLocaleDateString(undefined, { weekday: "short" })}</span><span className="font-heading text-lg font-semibold">{d.getDate()}</span><span className="block text-[11px] opacity-80">{d.toLocaleDateString(undefined, { month: "short" })}</span></button>; })}</div>
              <div role="radiogroup" aria-label="Time" className="grid grid-cols-4 gap-2 sm:grid-cols-6">{(days[day] ?? []).map((t) => <button key={t} type="button" role="radio" aria-checked={t === time} onClick={() => setTime(t)} className={`rounded-xl border px-2 py-2 text-sm tabular-nums ${t === time ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white hover:border-[var(--primary)]"}`}>{t}</button>)}</div>
            </>
          ))}
          {canOverride && <div className="rounded-2xl border border-dashed border-[var(--border)] p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />Move outside the doctor&apos;s schedule (exception)</label>
            {override && <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="New date & time">{(p) => <input {...p} type="datetime-local" value={free} onChange={(e) => setFree(e.target.value)} className={inputCls} />}</Field><Field label="Reason (audited)">{(p) => <input {...p} value={why} maxLength={300} onChange={(e) => setWhy(e.target.value)} className={inputCls} />}</Field></div>}</div>}
          {err && <Notice kind="error">{err}</Notice>}
        </div>
      )}
    </Modal>
  );
}

/** Day agenda: one row per hour, appointments as status-coloured chips. */
function DayCalendar({ day, setDay, items, loading, error, reload }: { day: string; setDay: (d: string) => void; items: Appt[]; loading: boolean; error: string; reload: () => void }) {
  const tone: Record<string, string> = { scheduled: "border-amber-300 bg-amber-50", confirmed: "border-blue-300 bg-blue-50", checked_in: "border-indigo-300 bg-indigo-50", waiting: "border-sky-300 bg-sky-50", in_consultation: "border-violet-300 bg-violet-50", completed: "border-emerald-300 bg-emerald-50", cancelled: "border-slate-300 bg-slate-100 opacity-70", no_show: "border-red-300 bg-red-50" };
  const list = items.filter((a) => a.appointment_at.slice(0, 10) === day);
  const hours = list.length ? Array.from({ length: Math.max(...list.map((a) => +a.appointment_at.slice(11, 13))) - Math.min(8, ...list.map((a) => +a.appointment_at.slice(11, 13))) + 1 }, (_, i) => Math.min(8, ...list.map((a) => +a.appointment_at.slice(11, 13))) + i) : [];
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setDay(addDays(day, -1))} className={btnGhost} aria-label="Previous day">←</button>
        <label htmlFor="cal-day" className="sr-only">Day</label><input id="cal-day" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm" />
        <button onClick={() => setDay(addDays(day, 1))} className={btnGhost} aria-label="Next day">→</button>
        <button onClick={() => setDay(todayStr())} className={btnGhost}>Today</button>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !items.length ? <ListSkeleton rows={4} />
        : list.length === 0 ? <EmptyState title="No appointments this day" hint="Pick another day or book one." />
        : (
          <ol className={`${cardCls} divide-y divide-[var(--border)]/60 ${loading ? "opacity-60" : ""}`}>
            {hours.map((h) => (
              <li key={h} className="grid grid-cols-[4rem_1fr] gap-3 px-4 py-2">
                <span className="pt-1 text-xs font-semibold tabular-nums text-[var(--muted)]">{String(h).padStart(2, "0")}:00</span>
                <div className="flex flex-wrap gap-2">
                  {list.filter((a) => +a.appointment_at.slice(11, 13) === h).map((a) => (
                    <Link key={a.id} href={a.patient ? `/patients/${a.patient.id}` : "#"} className={`min-w-[12rem] rounded-xl border px-3 py-1.5 text-xs ${tone[a.status] ?? "border-slate-300"}`}>
                      <b className="tabular-nums">{fmtTime(a.appointment_at)}</b> {a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}
                      <span className="block text-[11px] text-[var(--muted)]">{a.doctor?.user?.name} · {a.status.replace(/_/g, " ")}</span>
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
    </div>
  );
}
