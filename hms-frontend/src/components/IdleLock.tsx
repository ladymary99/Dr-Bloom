"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { btnGhost, btnPrimary, inputCls } from "@/components/ui";

const EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
const LOCK_KEY = "hms-locked";

/**
 * Screens in wards and corridors get left open. After `lockAfterMs` without input the app is covered by a lock
 * screen (the content stays mounted underneath, so a half-written note is not lost). Unlock = password.
 * After `logoutAfterMs` the session is ended. The lock survives a page refresh.
 */
export default function IdleLock({ onLogout, lockAfterMs = 10 * 60_000, logoutAfterMs = 30 * 60_000 }: { onLogout: () => void; lockAfterMs?: number; logoutAfterMs?: number }) {
  const user = useAuthStore((s) => s.user);
  const [locked, setLocked] = useState(() => typeof window !== "undefined" && sessionStorage.getItem(LOCK_KEY) === "1");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const last = useRef(0);
  const lockedRef = useRef(locked);
  const logoutRef = useRef(onLogout);

  useEffect(() => { lockedRef.current = locked; if (locked) sessionStorage.setItem(LOCK_KEY, "1"); else sessionStorage.removeItem(LOCK_KEY); }, [locked]);
  useEffect(() => { logoutRef.current = onLogout; }, [onLogout]);

  useEffect(() => {
    last.current = Date.now();
    const bump = () => { if (!lockedRef.current) last.current = Date.now(); };
    EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const tick = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= logoutAfterMs) logoutRef.current();
      else if (idle >= lockAfterMs && !lockedRef.current) setLocked(true);
    }, 1000);
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); setLocked(true); } };
    window.addEventListener("keydown", onKey);
    return () => { EVENTS.forEach((e) => window.removeEventListener(e, bump)); window.removeEventListener("keydown", onKey); clearInterval(tick); };
  }, [lockAfterMs, logoutAfterMs]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await api.post("/me/verify-password", { password: pw }); setPw(""); last.current = Date.now(); setLocked(false); }
    catch (er) {
      const status = (er as { response?: { status?: number } }).response?.status;
      setErr(apiError(er, "Could not verify.")); if (status === 429) setTimeout(() => logoutRef.current(), 1500);
    } finally { setBusy(false); }
  }

  if (!locked) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Screen locked" className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-[var(--primary)]/90 p-4 backdrop-blur-xl">
      <form onSubmit={unlock} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/40 text-xl">🔒</div>
        <div><h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Screen locked</h2><p className="text-sm text-[var(--muted)]">Locked after inactivity to protect patient data. Enter the password for {user?.name}.</p></div>
        <div className="text-left"><label htmlFor="unlock-pw" className="sr-only">Password</label><input id="unlock-pw" type="password" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} placeholder="Password" /></div>
        {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
        <div className="flex gap-2"><button type="button" onClick={() => onLogout()} className={`${btnGhost} flex-1`}>Sign out</button><button disabled={busy || !pw} className={`${btnPrimary} flex-1`}>{busy ? "Checking…" : "Unlock"}</button></div>
      </form>
    </div>
  );
}
