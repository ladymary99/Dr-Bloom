"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { Field, Notice, StatusBadge, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Flash = { kind: "success" | "error"; text: string } | null;

/** Authenticator-app two-factor setup for any account (patient or staff). */
export default function TwoFactorCard({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  const t = useT();
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    if (!setup) return;
    let alive = true;
    import("qrcode").then((m) => m.toDataURL(setup.otpauth_uri, { margin: 1, width: 180 })).then((u) => alive && setQr(u)).catch(() => {});
    return () => { alive = false; };
  }, [setup]);

  async function start() { setBusy(true); setFlash(null); try { setSetup((await api.post("/2fa/setup")).data); } catch (e) { setFlash({ kind: "error", text: apiError(e) }); } finally { setBusy(false); } }
  async function confirm() { setBusy(true); setFlash(null); try { await api.post("/2fa/confirm", { code }); setSetup(null); setCode(""); setFlash({ kind: "success", text: "Two-factor authentication is on." }); onChange(); } catch (e) { setFlash({ kind: "error", text: apiError(e) }); } finally { setBusy(false); } }
  async function disable() { setBusy(true); setFlash(null); try { await api.post("/2fa/disable", { code, current_password: pw }); setCode(""); setPw(""); setFlash({ kind: "success", text: "Two-factor authentication is off." }); onChange(); } catch (e) { setFlash({ kind: "error", text: apiError(e) }); } finally { setBusy(false); } }

  return (
    <section className={`${cardCls} p-6`}><h2 className="font-heading text-base font-semibold">{t("Two-factor authentication")}</h2><p className="mb-4 mt-0.5 text-sm text-[var(--muted)]">Add a second step at sign-in with an authenticator app (Google Authenticator, Authy, 1Password…). Recommended for medical data.</p>
      <div className="mb-3 flex items-center gap-2 text-sm">Status: <StatusBadge status={enabled ? "confirmed" : "cancelled"} /><span className="sr-only">{enabled ? "enabled" : "disabled"}</span><span>{enabled ? "On" : "Off"}</span></div>
      {flash && <div className="mb-3"><Notice kind={flash.kind}>{flash.text}</Notice></div>}
      {!enabled && !setup && <button onClick={start} disabled={busy} className={btnPrimary}>Set up</button>}
      {setup && (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm"><li>Scan this QR code with your authenticator app (or enter the key manually).</li><li>Type the 6-digit code it shows to finish.</li></ol>
          <div className="flex flex-wrap items-center gap-4">
            {qr && <img src={qr} alt="QR code for your authenticator app" width={150} height={150} className="rounded-xl border border-[var(--border)]" />} {/* data: URL QR code, next/image adds nothing here */}
            <p className="text-xs">Manual key:<br /><code className="select-all break-all rounded bg-slate-100 px-2 py-1 text-sm tracking-wider">{setup.secret}</code></p>
          </div>
          <div className="flex items-end gap-2"><Field label="6-digit code">{(p) => <input {...p} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={`${inputCls} w-40 tracking-widest`} />}</Field>
            <button onClick={confirm} disabled={busy || code.length !== 6} className={btnPrimary}>Turn on</button><button onClick={() => setSetup(null)} className={btnGhost}>{t("Cancel")}</button></div>
        </div>
      )}
      {enabled && (
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <Field label="Current password">{(p) => <input {...p} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} />}</Field>
          <Field label="Authenticator code">{(p) => <input {...p} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={inputCls} />}</Field>
          <button onClick={disable} disabled={busy || code.length !== 6 || !pw} className={btnDanger}>Turn off</button>
        </div>
      )}
    </section>
  );
}
