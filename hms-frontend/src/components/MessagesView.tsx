"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtDateTime, fmtShortDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { usePortal } from "@/store/portal";
import { Avatar, EmptyState, ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Thread = { id: string; subject: string; last_message_at: string | null; preview: string; unread: number; status?: "open" | "resolved"; patient: { id: string; name: string; mrn: string } | null; staff: { id: number; name: string } | null };
type Msg = { id: string; body: string; created_at: string; mine: boolean; sender: string | null };
type CareMember = { user_id: number; name: string; specialization: string | null };
type PatientHit = { id: string; first_name: string; last_name: string; mrn: string };

/** One inbox for both sides; the API scopes what each role can see. */
export default function MessagesView({ audience }: { audience: "patient" | "staff" }) {
  const t = useT();
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<{ open: number; awaiting_reply: number; avg_first_response_minutes: number | null } | null>(null);
  const setMeta = usePortal((s) => s.setMeta);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Thread[]>("/messages");
      setThreads(data);
      setError("");
      if (audience === "patient") setMeta({ unreadMessages: data.reduce((n, x) => n + x.unread, 0) });
      else api.get("/messages-stats").then((r) => setStats(r.data)).catch(() => {});
    } catch (e) {
      setError(apiError(e));
    }
  }, [audience, setMeta]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const active = threads?.find((x) => x.id === activeId) ?? null;
  const term = search.trim().toLowerCase();
  const shown = (threads ?? []).filter((x) =>
    (audience === "patient" || filter === "all" || (x.status ?? "open") === filter) &&
    (!term || [x.subject, x.preview, x.patient?.name, x.patient?.mrn, x.staff?.name].some((f) => f?.toLowerCase().includes(term))));
  const unreadTotal = (threads ?? []).reduce((n, x) => n + x.unread, 0);

  return (
    <div className={audience === "staff" ? "w-full" : "mx-auto max-w-5xl"}>
      <PageHeader title={t("Messages")} subtitle={audience === "patient" ? "Secure messages with your care team. For emergencies, call your local emergency number." : "Secure messages with patients."}
        actions={<button onClick={() => setComposeOpen(true)} className={btnPrimary}>{t("New message")}</button>} />
      {audience === "patient" && <div className="mb-4"><Notice kind="warn">Messages are not monitored around the clock and are not for emergencies.</Notice></div>}
      {audience === "staff" && stats && (
        <dl className="mb-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl bg-white p-3 shadow-sm"><dt className="text-xs text-[var(--muted)]">Open</dt><dd className="font-heading text-xl font-semibold">{stats.open}</dd></div>
          <div className="rounded-2xl bg-white p-3 shadow-sm"><dt className="text-xs text-[var(--muted)]">Awaiting first reply</dt><dd className="font-heading text-xl font-semibold">{stats.awaiting_reply}</dd></div>
          <div className="rounded-2xl bg-white p-3 shadow-sm"><dt className="text-xs text-[var(--muted)]">Avg first response (30 d)</dt><dd className="font-heading text-xl font-semibold">{stats.avg_first_response_minutes === null ? "—" : stats.avg_first_response_minutes < 90 ? `${stats.avg_first_response_minutes} min` : `${Math.round(stats.avg_first_response_minutes / 60)} h`}</dd></div>
        </dl>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="msg-search" className="sr-only">Search conversations</label>
        <input id="msg-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations…" className="w-64 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm focus:border-[var(--primary)] focus:outline-none" />
        {audience === "staff" && (
          <div role="group" aria-label="Status" className="inline-flex rounded-full border border-[var(--border)] bg-white p-1">
            {(["open", "resolved", "all"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-full px-4 py-1 text-sm font-medium capitalize ${filter === f ? "bg-[var(--primary)] text-white" : "text-[var(--muted)]"}`}>{f}</button>)}
          </div>
        )}
        {unreadTotal > 0 && <span className="text-xs font-semibold text-[var(--primary)]">{unreadTotal} unread</span>}
      </div>

      {error ? <ErrorState message={error} onRetry={load} />
        : !threads ? <ListSkeleton rows={3} />
        : threads.length === 0 || shown.length === 0 ? <EmptyState title={threads.length && shown.length === 0 ? "No conversations match" : "No conversations yet"} hint={threads.length && shown.length === 0 ? "Try another filter or clear the search." : audience === "patient" ? "Ask your doctor a question or contact the clinic's front desk." : "Messages from patients will appear here."} action={{ label: t("New message"), onClick: () => setComposeOpen(true) }} />
        : (
          <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
            <ul aria-label="Conversations" className={`${cardCls} max-h-[70vh] divide-y divide-[var(--border)] overflow-y-auto ${active ? "hidden md:block" : ""}`}>
              {shown.map((x) => {
                const who = audience === "patient" ? (x.staff?.name ? `Dr. ${x.staff.name}` : "Clinic front desk") : x.patient?.name ?? "Patient";
                return (
                  <li key={x.id}>
                    <button onClick={() => setActiveId(x.id)} aria-current={x.id === activeId} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--primary-tint)]/15 ${x.id === activeId ? "bg-[var(--primary-tint)]/25" : ""}`}>
                      <Avatar name={who} className="h-10 w-10" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2"><span className={`truncate text-sm ${x.unread ? "font-bold" : "font-semibold"}`}>{who}{x.status === "resolved" && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-900">RESOLVED</span>}</span><span className="flex-none text-[10px] text-[var(--muted)]">{fmtShortDate(x.last_message_at)}</span></span>
                        <span className="block truncate text-xs font-medium">{x.subject}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">{x.preview}</span>
                      </span>
                      {x.unread > 0 && <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white"><span className="sr-only">{x.unread} unread</span><span aria-hidden>{x.unread}</span></span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className={active ? "" : "hidden md:block"}>
              {active ? <Conversation key={active.id} thread={active} onBack={() => setActiveId(null)} onChanged={load} audience={audience} />
                : <div className={`${cardCls} hidden h-full min-h-[16rem] items-center justify-center p-8 text-sm text-[var(--muted)] md:flex`}>Select a conversation</div>}
            </div>
          </div>
        )}

      <Compose open={composeOpen} audience={audience} onClose={() => setComposeOpen(false)} onSent={(id) => { setComposeOpen(false); load().then(() => setActiveId(id)); }} />
    </div>
  );
}

const QUICK_REPLIES = [
  "Thank you for your message. I have read it and will come back to you shortly.",
  "Please book an appointment so that I can examine you in person.",
  "Your results are available in your portal under Medical records. Please let me know if you have questions.",
  "Please continue the treatment as prescribed and contact us if the symptoms get worse.",
  "If this is an emergency, please call your local emergency number or go to the nearest emergency department.",
];

function Conversation({ thread, onBack, onChanged, audience }: { thread: Thread; onBack: () => void; onChanged: () => void; audience: "patient" | "staff" }) {
  const t = useT();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [err, setErr] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ messages: Msg[] }>(`/messages/${thread.id}`);
      setMsgs(data.messages);
      setErr("");
      onChanged();
    } catch (e) {
      setErr(apiError(e));
    }
    // onChanged identity changes every parent render; we only want to refetch per thread/interval
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs?.length]);

  async function send() {
    if (!body.trim()) return;
    setBusy(true); setErr("");
    try {
      await api.post(`/messages/${thread.id}/reply`, { body: body.trim() });
      setBody("");
      await load();
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  }

  async function toggleResolved() {
    try { await api.put(`/messages/${thread.id}/resolve`, { resolved: thread.status !== "resolved" }); onChanged(); } catch (e) { setErr(apiError(e)); }
  }

  const who = audience === "patient" ? (thread.staff?.name ? `Dr. ${thread.staff.name}` : "Clinic front desk") : `${thread.patient?.name ?? "Patient"}${thread.patient ? ` · ${thread.patient.mrn}` : ""}`;

  return (
    <section aria-label={`Conversation with ${who}`} className={`${cardCls} flex max-h-[70vh] min-h-[24rem] flex-col`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3">
        <button onClick={onBack} className="md:hidden" aria-label={t("Back")}>←</button>
        <div className="min-w-0 flex-1"><h2 className="truncate font-heading text-sm font-semibold">{thread.subject}</h2><p className="truncate text-xs text-[var(--muted)]">{who}</p></div>
        {audience === "staff" && (
          <div className="flex items-center gap-3 text-xs font-semibold">
            {thread.patient && <Link href={`/patients/${thread.patient.id}`} className="text-[var(--primary)] underline-offset-2 hover:underline">Open chart</Link>}
            <button onClick={toggleResolved} className={thread.status === "resolved" ? "text-[var(--primary)] hover:underline" : "rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-900"}>{thread.status === "resolved" ? "Reopen" : "Mark resolved"}</button>
          </div>
        )}
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {err && <Notice kind="error">{err}</Notice>}
        {!msgs ? <ListSkeleton rows={2} /> : msgs.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.mine ? "rounded-br-md bg-[var(--primary)] text-white" : "rounded-bl-md bg-slate-100 text-[var(--ink)]"}`}>
              {!m.mine && <p className="mb-0.5 text-[11px] font-semibold opacity-70">{m.sender}</p>}
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.mine ? "text-white/70" : "text-[var(--muted)]"}`}>{fmtDateTime(m.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-[var(--border)] p-3">
        {audience === "staff" && (
          <div className="flex-none self-end">
            <label htmlFor="tpl" className="sr-only">Insert quick reply</label>
            <select id="tpl" value="" onChange={(e) => e.target.value && setBody((b) => (b ? b + "\n" : "") + e.target.value)} className="w-28 rounded-xl border border-[var(--border)] bg-white px-2 py-2.5 text-xs">
              <option value="">Quick reply…</option>
              {QUICK_REPLIES.map((q) => <option key={q} value={q}>{q.slice(0, 40)}…</option>)}
            </select>
          </div>
        )}
        <label htmlFor="reply" className="sr-only">Your reply</label>
        <textarea id="reply" rows={2} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          placeholder="Write a reply… (Ctrl+Enter to send)" className={`${inputCls} resize-none`} />
        <button type="submit" disabled={busy || !body.trim()} className={btnPrimary}>{t("Send")}</button>
      </form>
    </section>
  );
}

function Compose({ open, audience, onClose, onSent }: { open: boolean; audience: "patient" | "staff"; onClose: () => void; onSent: (id: string) => void }) {
  const t = useT();
  const [team, setTeam] = useState<CareMember[]>([]);
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && audience === "patient") api.get<CareMember[]>("/portal/care-team").then((r) => setTeam(r.data)).catch(() => {});
  }, [open, audience]);

  async function search() {
    if (!q.trim()) return;
    try { const { data } = await api.get("/patients", { params: { search: q } }); setHits(data.data.slice(0, 5)); } catch { setHits([]); }
  }

  async function send() {
    setBusy(true); setErr("");
    try {
      const payload = audience === "patient" ? { staff_user_id: to ? Number(to) : null, subject, body } : { patient_id: patient?.id, subject, body };
      const { data } = await api.post("/messages", payload);
      setSubject(""); setBody(""); setTo(""); setPatient(null); setQ(""); setHits([]);
      onSent(data.id);
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  }

  const ready = subject.trim().length >= 2 && body.trim() && (audience === "patient" || patient);
  return (
    <Modal open={open} onClose={onClose} title={t("New message")}
      footer={<><button onClick={onClose} className={btnGhost}>{t("Cancel")}</button><button onClick={send} disabled={!ready || busy} className={btnPrimary}>{busy ? "Sending…" : t("Send")}</button></>}>
      <div className="space-y-4">
        {audience === "patient" ? (
          <Field label="To" hint="You can message doctors you've seen or booked with, or the clinic's front desk.">
            {(p) => <select {...p} value={to} onChange={(e) => setTo(e.target.value)} className={inputCls}><option value="">Clinic front desk</option>{team.map((m) => <option key={m.user_id} value={m.user_id}>Dr. {m.name}{m.specialization ? ` · ${m.specialization}` : ""}</option>)}</select>}
          </Field>
        ) : (
          <div>
            <Field label="Patient (name or MRN)">{(p) => <div className="flex gap-2"><input {...p} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())} className={inputCls} /><button type="button" onClick={search} className={btnGhost}>{t("Search")}</button></div>}</Field>
            {patient ? <p className="mt-2 text-sm">To: <strong>{patient.first_name} {patient.last_name}</strong> · {patient.mrn}</p>
              : hits.length > 0 && <ul className="mt-2 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">{hits.map((h) => <li key={h.id}><button type="button" onClick={() => setPatient(h)} className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--primary-tint)]/20">{h.first_name} {h.last_name} <span className="text-[var(--muted)]">· {h.mrn}</span></button></li>)}</ul>}
          </div>
        )}
        <Field label={t("Subject")}>{(p) => <input {...p} value={subject} maxLength={160} onChange={(e) => setSubject(e.target.value)} className={inputCls} />}</Field>
        <Field label={t("Message")}>{(p) => <textarea {...p} rows={5} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} className={inputCls} />}</Field>
        {err && <Notice kind="error">{err}</Notice>}
      </div>
    </Modal>
  );
}
