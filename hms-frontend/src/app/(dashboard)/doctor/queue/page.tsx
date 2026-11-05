"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtDate, fmtTime, todayStr } from "@/lib/format";
import StartVisitButton from "@/components/StartVisitButton";
import { EmptyState, ErrorState, ListSkeleton, Notice, PageHeader, StatusBadge, btnGhost, cardCls } from "@/components/ui";

type Item = {
  id: string; appointment_at: string; status: string; reason: string | null; visit_type: "in_person" | "online"; meeting_url: string | null;
  duration_minutes: number; checked_in_at: string | null; is_overdue: boolean;
  patient: { id: string; mrn: string; first_name: string; last_name: string; date_of_birth: string; gender: string; blood_type: string | null; allergies: string | null } | null;
  visit?: { id: string; status: string } | null;
};

const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10);
const LIVE = ["scheduled", "confirmed", "checked_in", "waiting", "in_consultation"];
const FLOW = [
  { id: "booked", label: "Booked", match: ["scheduled", "confirmed"] },
  { id: "checked_in", label: "Checked in", match: ["checked_in"] },
  { id: "waiting", label: "Waiting", match: ["waiting"] },
  { id: "in_consultation", label: "In consultation", match: ["in_consultation"] },
  { id: "completed", label: "Completed", match: ["completed"] },
] as const;

export default function DoctorQueuePage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [date, setDate] = useState(todayStr);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<string>("active");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try { const { data } = await api.get<Item[]>("/doctor/queue", { params: { date } }); setItems(data); setError(""); }
    catch (e) { setError(apiError(e, "Could not load the queue.")); }
  }, [date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(() => { load(); setNow(Date.now()); }, 30_000);   // keep the room current
    return () => clearInterval(id);
  }, [load]);

  async function setStatus(a: Item, status: string) {
    setMsg(null);
    if (status === "no_show" && !confirm(`Mark ${a.patient?.first_name} ${a.patient?.last_name} as a no-show?`)) return;
    try { await api.put(`/appointments/${a.id}`, { status }); await load(); }
    catch (e) { setMsg({ kind: "error", text: apiError(e) }); }
  }

  const rows = (items ?? []).filter((i) => (filter === "active" ? LIVE.includes(i.status) : filter === "all" ? true : (FLOW.find((f) => f.id === filter)?.match as readonly string[] | undefined)?.includes(i.status)));
  const count = (ids: readonly string[]) => (items ?? []).filter((i) => ids.includes(i.status)).length;
  const live = (items ?? []).filter((i) => LIVE.includes(i.status));
  // call-next order: already waiting → arrived → booked (by time)
  const nextUp = ["waiting", "checked_in", "scheduled", "confirmed"].map((s) => live.find((i) => i.status === s)).find(Boolean) ?? null;
  const inRoom = live.find((i) => i.status === "in_consultation");
  const waitedMin = (a: Item) => (a.checked_in_at ? Math.max(0, Math.round((now - new Date(a.checked_in_at).getTime()) / 60000)) : null);

  return (
    <div className="animate-fade-up w-full">
      <PageHeader title="My queue" subtitle={items ? `${live.length} still to see · ${items.length} on ${fmtDate(date + "T00:00:00")}` : "Loading…"}
        actions={<><label htmlFor="q-date" className="sr-only">Date</label><input id="q-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm" /></>} />

      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}

      {date === todayStr() && nextUp?.patient && !inRoom && (
        <div className={`${cardCls} mb-4 flex flex-wrap items-center justify-between gap-3 p-5`}>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Next up</p><p className="font-heading text-lg font-semibold">{nextUp.patient.first_name} {nextUp.patient.last_name} <span className="text-sm font-normal text-[var(--muted)]">{fmtTime(nextUp.appointment_at)} · {nextUp.reason ?? "no reason given"}</span></p></div>
          <StartVisitButton appointmentId={nextUp.id} patientId={nextUp.patient.id} visitId={nextUp.visit?.id} label="Call next patient" onError={(t) => setMsg({ kind: "error", text: t })} />
        </div>
      )}
      {inRoom?.patient && <div className="mb-4"><Notice kind="info">In consultation: <b>{inRoom.patient.first_name} {inRoom.patient.last_name}</b>. <Link className="font-semibold underline" href={`/doctor/consult/${inRoom.id}`}>Return to the visit</Link></Notice></div>}

      {/* flow strip: Booked → Checked in → Waiting → In consultation → Completed */}
      <nav aria-label="Queue stages" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[{ id: "active", label: "All active", n: live.length }, ...FLOW.map((f) => ({ id: f.id as string, label: f.label, n: count(f.match)})), { id: "all", label: "Everything", n: items?.length ?? 0 }].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
            className={`flex-none rounded-full border px-4 py-1.5 text-sm font-medium transition ${filter === f.id ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white text-[var(--ink)] hover:border-[var(--primary-tint)]"}`}>
            {f.label} <span className={`ml-1 text-xs ${filter === f.id ? "opacity-80" : "text-[var(--muted)]"}`}>{f.n}</span>
          </button>
        ))}
      </nav>

      {error ? <ErrorState message={error} onRetry={load} /> : !items ? <ListSkeleton rows={4} />
        : rows.length === 0 ? <EmptyState title={filter === "active" ? "Nobody left to see" : "Nothing in this stage"} hint="Appointments move through the stages as patients arrive and you see them." />
        : (
          <ul className="space-y-3">
            {rows.map((a) => {
              const pt = a.patient;
              const w = ["checked_in", "waiting"].includes(a.status) ? waitedMin(a) : null;
              return (
                <li key={a.id} className={`${cardCls} flex flex-wrap items-center gap-4 p-4 ${w !== null && w >= 30 ? "ring-2 ring-amber-300" : ""}`}>
                  <span className="w-16 flex-none text-center"><span className="block font-heading text-lg font-semibold tabular-nums">{fmtTime(a.appointment_at)}</span><span className="text-[10px] text-[var(--muted)]">{a.duration_minutes} min</span></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--ink)]">{pt ? <Link href={`/patients/${pt.id}`} className="hover:underline">{pt.first_name} {pt.last_name}</Link> : "—"}
                      <span className="ml-2 text-xs font-normal text-[var(--muted)]">{pt ? `${age(pt.date_of_birth)} y · ${pt.gender}${pt.blood_type ? ` · ${pt.blood_type}` : ""} · ${pt.mrn}` : ""}</span></p>
                    <p className="truncate text-sm text-[var(--muted)]">{a.reason ?? "No reason given"}{a.visit_type === "online" ? " · video visit" : ""}</p>
                    {pt?.allergies && <p className="mt-0.5 text-xs font-semibold text-red-800">⚠ Allergies: {pt.allergies}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={a.status} />
                    {w !== null && <span className={`text-xs font-semibold ${w >= 30 ? "text-amber-800" : "text-[var(--muted)]"}`}>waiting {w} min</span>}
                    {a.is_overdue && <span className="text-xs font-semibold text-amber-800">needs update</span>}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {["scheduled", "confirmed"].includes(a.status) && <button onClick={() => setStatus(a, "checked_in")} className={btnGhost}>Check in</button>}
                    {["scheduled", "confirmed", "checked_in"].includes(a.status) && <button onClick={() => setStatus(a, "waiting")} className={btnGhost}>To waiting list</button>}
                    {pt && LIVE.includes(a.status) && <StartVisitButton appointmentId={a.id} patientId={pt.id} visitId={a.visit?.id} onError={(t) => setMsg({ kind: "error", text: t })} />}
                    {a.visit_type === "online" && a.meeting_url && LIVE.includes(a.status) && <a href={a.meeting_url} target="_blank" rel="noopener noreferrer" className={btnGhost}>Video</a>}
                    {["scheduled", "confirmed", "checked_in", "waiting"].includes(a.status) && <button onClick={() => setStatus(a, "no_show")} className="text-xs font-medium text-red-700 hover:underline">No-show</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
