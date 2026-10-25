"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError, downloadFile, fmtShortDate } from "@/lib/format";
import { LANGS, useLang, useT, type Lang } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { useFetch } from "@/hooks/useFetch";
import { ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, StatusBadge, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Prefs = { email: boolean; sms: boolean; appointment_reminders: boolean; messages: boolean; billing: boolean };
type ProfileResp = { patient: { notification_prefs: Prefs; privacy_accepted_at: string | null; privacy_policy_version: string | null }; user: { email: string; two_factor_enabled: boolean }; privacy_policy_version: string };
type Req = { id: string; type: "export" | "delete"; status: string; created_at: string; resolved_at: string | null };

type Flash = { kind: "success" | "error"; text: string } | null;
const PREF_ROWS: [keyof Prefs, string, string][] = [
  ["email", "Email notifications", "Allow the clinic to email you."],
  ["sms", "SMS notifications", "Text messages (only if the clinic has SMS enabled)."],
  ["appointment_reminders", "Appointment reminders", "24 hours and 1 hour before each visit."],
  ["messages", "New messages", "When your care team writes to you."],
  ["billing", "Billing updates", "Receipts and insurance claim updates."],
];

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return <section className={`${cardCls} p-6`}><h2 className="font-heading text-base font-semibold">{title}</h2>{desc && <p className="mb-4 mt-0.5 text-sm text-[var(--muted)]">{desc}</p>}<div className={desc ? "" : "mt-4"}>{children}</div></section>;
}

export default function SettingsPage() {
  const t = useT();
  const { lang, setLang } = useLang();
  const { data, error, reload } = useFetch<ProfileResp>("/portal/profile");
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <div className="mx-auto max-w-3xl"><ListSkeleton rows={4} /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={t("Settings")} subtitle="Account security, notifications and your data." />
      <PasswordCard />
      <EmailCard current={data.user.email} />
      <TwoFactorCard enabled={data.user.two_factor_enabled} onChange={reload} />
      <PrefsCard initial={data.patient.notification_prefs} />
      <Card title={t("Language")} desc="Choose the language of the portal.">
        <Field label={t("Language")}>{(p) => <select {...p} value={lang} onChange={(e) => { setLang(e.target.value as Lang); api.put("/portal/profile", { preferred_language: e.target.value }).catch(() => {}); }} className={inputCls}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select>}</Field>
      </Card>
      <PrivacyCard acceptedAt={data.patient.privacy_accepted_at} version={data.patient.privacy_policy_version} />
    </div>
  );
}

function PasswordCard() {
  const t = useT();
  const [f, setF] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setFlash(null);
    try { const { data } = await api.put("/me/password", f); setFlash({ kind: "success", text: data.message }); setF({ current_password: "", password: "", password_confirmation: "" }); }
    catch (err) { setFlash({ kind: "error", text: apiError(err, "Could not change password.") }); } finally { setBusy(false); }
  }
  return (
    <Card title={t("Password")} desc="Use at least 8 characters. Other devices will be signed out.">
      <form onSubmit={save} className="space-y-3">
        <Field label="Current password">{(p) => <input {...p} type="password" autoComplete="current-password" required value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} className={inputCls} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="New password">{(p) => <input {...p} type="password" autoComplete="new-password" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={inputCls} />}</Field>
          <Field label="Confirm new password">{(p) => <input {...p} type="password" autoComplete="new-password" required minLength={8} value={f.password_confirmation} onChange={(e) => setF({ ...f, password_confirmation: e.target.value })} className={inputCls} />}</Field>
        </div>
        {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
        <button disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Update password"}</button>
      </form>
    </Card>
  );
}

function EmailCard({ current }: { current: string }) {
  const t = useT();
  const setAuth = useAuthStore();
  const [email, setEmail] = useState(current);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setFlash(null);
    try {
      const { data } = await api.put("/portal/email", { email, current_password: pw });
      setFlash({ kind: "success", text: data.message }); setPw("");
      if (setAuth.user) setAuth.setAuth({ token: setAuth.token, user: { ...setAuth.user, email: data.email }, roles: setAuth.roles, permissions: setAuth.permissions });
    } catch (err) { setFlash({ kind: "error", text: apiError(err, "Could not change email.") }); } finally { setBusy(false); }
  }
  return (
    <Card title={t("Email")} desc="This is where confirmations and reminders are sent, and what you sign in with.">
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email address">{(p) => <input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />}</Field>
          <Field label="Confirm with your password">{(p) => <input {...p} type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} />}</Field>
        </div>
        {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
        <button disabled={busy || email === current} className={btnPrimary}>{busy ? "Saving…" : "Change email"}</button>
      </form>
    </Card>
  );
}

function TwoFactorCard({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
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
    <Card title={t("Two-factor authentication")} desc="Add a second step at sign-in with an authenticator app (Google Authenticator, Authy, 1Password…). Recommended for medical data.">
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
    </Card>
  );
}

function PrefsCard({ initial }: { initial: Prefs }) {
  const t = useT();
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  async function save() {
    setBusy(true); setFlash(null);
    try { await api.put("/portal/preferences", prefs); setFlash({ kind: "success", text: "Preferences saved." }); } catch (e) { setFlash({ kind: "error", text: apiError(e) }); } finally { setBusy(false); }
  }
  return (
    <Card title={t("Notification preferences")} desc="In-app notifications (the bell) are always on. These control email and SMS.">
      <ul className="divide-y divide-[var(--border)]">
        {PREF_ROWS.map(([k, label, hint]) => (
          <li key={k} className="flex items-center justify-between gap-4 py-3">
            <div><p id={`pref-${k}`} className="text-sm font-medium">{label}</p><p className="text-xs text-[var(--muted)]">{hint}</p></div>
            <button role="switch" aria-checked={prefs[k]} aria-labelledby={`pref-${k}`} onClick={() => setPrefs({ ...prefs, [k]: !prefs[k] })}
              className={`relative h-7 w-12 flex-none rounded-full transition ${prefs[k] ? "bg-[var(--primary)]" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${prefs[k] ? "left-[1.4rem]" : "left-0.5"}`} />
            </button>
          </li>
        ))}
      </ul>
      {flash && <div className="mt-3"><Notice kind={flash.kind}>{flash.text}</Notice></div>}
      <button onClick={save} disabled={busy} className={`${btnPrimary} mt-4`}>{busy ? "Saving…" : t("Save changes")}</button>
    </Card>
  );
}

function PrivacyCard({ acceptedAt, version }: { acceptedAt: string | null; version: string | null }) {
  const t = useT();
  const reqs = useFetch<Req[]>("/portal/privacy/requests");
  const [flash, setFlash] = useState<Flash>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportNow() {
    setBusy(true); setFlash(null);
    try { await downloadFile(api, "/portal/privacy/export", `my-health-data-${new Date().toISOString().slice(0, 10)}.json`); setFlash({ kind: "success", text: "Your data was downloaded as a JSON file." }); }
    catch (e) { setFlash({ kind: "error", text: apiError(e, "Could not export your data.") }); } finally { setBusy(false); }
  }
  async function requestDelete() {
    setBusy(true);
    try { await api.post("/portal/privacy/requests", { type: "delete", reason: reason.trim() || undefined }); setConfirmDel(false); setReason(""); setFlash({ kind: "success", text: "Your deletion request was sent to the clinic's administrator. We will contact you." }); reqs.reload(); }
    catch (e) { setFlash({ kind: "error", text: apiError(e) }); setConfirmDel(false); } finally { setBusy(false); }
  }

  return (
    <Card title={t("Privacy & data")} desc="You control your information.">
      <p className="mb-4 text-sm">{acceptedAt ? <>You accepted the privacy policy (version {version}) on {fmtShortDate(acceptedAt)}.</> : "You have not accepted the current privacy policy yet."}</p>
      {flash && <div className="mb-4"><Notice kind={flash.kind}>{flash.text}</Notice></div>}
      <div className="flex flex-wrap gap-2">
        <button onClick={exportNow} disabled={busy} className={btnGhost}>{t("Download my data")}</button>
        <button onClick={() => setConfirmDel(true)} className={btnDanger}>{t("Request account deletion")}</button>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">Clinical and billing records may have to be retained by law. When a deletion is approved, your identity is removed from them and your account is closed.</p>
      {(reqs.data ?? []).length > 0 && (
        <div className="mt-4"><h3 className="mb-2 text-xs font-semibold text-[var(--muted)]">Your requests</h3>
          <ul className="divide-y divide-[var(--border)] text-sm">{reqs.data?.map((r) => <li key={r.id} className="flex items-center justify-between py-2"><span className="capitalize">{r.type} · {fmtShortDate(r.created_at)}</span><StatusBadge status={r.status} /></li>)}</ul></div>
      )}
      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Request account deletion?"
        footer={<><button onClick={() => setConfirmDel(false)} className={btnGhost}>{t("Cancel")}</button><button onClick={requestDelete} disabled={busy} className={btnDanger}>Send request</button></>}>
        <div className="space-y-3 text-sm">
          <p>The clinic&apos;s administrator will review your request. Nothing is deleted until they approve it, and you can still use your account in the meantime.</p>
          <Field label="Reason (optional)">{(p) => <textarea {...p} rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />}</Field>
        </div>
      </Modal>
    </Card>
  );
}
