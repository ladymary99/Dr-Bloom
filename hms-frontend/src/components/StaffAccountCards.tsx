"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { Field, Notice, btnDanger, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Session = { id: number; created_at: string; last_used_at: string | null; current: boolean };

/** Contact + licence details, and the list of signed-in devices with a "sign out" per device. */
export default function StaffAccountCards() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const sp = user?.staff_profile;
  const [f, setF] = useState({ phone: sp?.phone ?? "", license_number: sp?.license_number ?? "", languages: sp?.languages ?? "" });
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<Session[] | null>(null);

  const loadSessions = () => api.get<Session[]>("/me/sessions").then((r) => setSessions(r.data)).catch(() => setSessions([]));
  useEffect(() => { loadSessions(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const { data } = await api.put("/me/staff-profile", { phone: f.phone || null, license_number: f.license_number || null, languages: f.languages || null });
      const st = useAuthStore.getState();
      setAuth({ token: st.token, user: { ...st.user, staff_profile: data.staff_profile ?? data.staffProfile ?? st.user.staff_profile }, roles: st.roles, permissions: st.permissions });
      setMsg({ kind: "success", text: "Saved." });
    } catch (err) { setMsg({ kind: "error", text: apiError(err) }); } finally { setBusy(false); }
  }

  async function revoke(id: number) {
    try { await api.delete(`/me/sessions/${id}`); loadSessions(); } catch (e) { setMsg({ kind: "error", text: apiError(e) }); }
  }

  if (!sp) return null;
  return (
    <>
      <section className={`${cardCls} p-6`}>
        <h2 className="font-heading text-base font-semibold">Contact & licence</h2>
        <p className="mb-4 mt-0.5 text-sm text-[var(--muted)]">The licence number is printed on your prescriptions and letters.</p>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
          <Field label="Phone">{(p) => <input {...p} type="tel" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls} />}</Field>
          <Field label="Licence number">{(p) => <input {...p} maxLength={60} value={f.license_number} onChange={(e) => setF({ ...f, license_number: e.target.value })} className={inputCls} />}</Field>
          <Field label="Languages">{(p) => <input {...p} maxLength={200} value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} className={inputCls} />}</Field>
          <div className="sm:col-span-3 flex items-center gap-3"><button disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Save"}</button>{msg && <Notice kind={msg.kind}>{msg.text}</Notice>}</div>
        </form>
      </section>

      <section className={`${cardCls} p-6`} aria-label="Active sessions">
        <h2 className="font-heading text-base font-semibold">Where you&apos;re signed in</h2>
        <p className="mb-4 mt-0.5 text-sm text-[var(--muted)]">Sign out devices you no longer use or recognise.</p>
        {!sessions ? <p className="text-sm text-[var(--muted)]">Loading…</p> : (
          <ul className="divide-y divide-[var(--border)] text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>{s.current ? <b>This device</b> : "Another device"}<span className="block text-xs text-[var(--muted)]">signed in {fmtShortDateTime(s.created_at)} · last active {fmtShortDateTime(s.last_used_at ?? s.created_at)}</span></span>
                {!s.current && <button onClick={() => revoke(s.id)} className={`${btnDanger} !px-3 !py-1 text-xs`}>Sign out</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
