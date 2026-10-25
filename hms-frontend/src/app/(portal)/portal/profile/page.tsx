"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";
import { useT, useLang, type Lang } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { useFetch } from "@/hooks/useFetch";
import AvatarUploadButton from "@/components/AvatarUploadButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import { ErrorState, Field, ListSkeleton, Notice, PageHeader, btnPrimary, cardCls, inputCls } from "@/components/ui";

type P = {
  mrn: string; first_name: string; last_name: string; date_of_birth: string | null; gender: string | null; phone: string | null; email: string | null;
  address: string | null; blood_type: string | null; allergies: string | null; chronic_conditions: string | null; current_medications: string | null;
  emergency_contact_name: string | null; emergency_contact_phone: string | null; emergency_contact_relation: string | null;
  insurance_provider: string | null; insurance_policy_number: string | null; insurance_group_number: string | null; insurance_expires_on: string | null;
  preferred_language: Lang;
};
type Resp = { patient: P };
type Form = Record<string, string>;

const FIELDS = ["first_name", "last_name", "date_of_birth", "gender", "phone", "address", "blood_type", "allergies", "chronic_conditions", "current_medications",
  "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relation", "insurance_provider", "insurance_policy_number", "insurance_group_number", "insurance_expires_on", "preferred_language"] as const;

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className={`${cardCls} p-6`}><legend className="sr-only">{title}</legend><h2 className="mb-4 font-heading text-base font-semibold">{title}</h2><div className="grid gap-4 sm:grid-cols-2">{children}</div></fieldset>
  );
}

export default function ProfilePage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const setLang = useLang((s) => s.setLang);
  const { data, error, reload } = useFetch<Resp>("/portal/profile");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    const f: Form = {};
    FIELDS.forEach((k) => { const v = data.patient[k]; f[k] = v ? String(v).slice(0, k.endsWith("_on") || k === "date_of_birth" ? 10 : 2000) : ""; });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(f);
  }, [data]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true); setMsg(null); setFieldErrors({});
    // send empty optional fields as null so they can be cleared
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" && !["first_name", "last_name", "phone", "date_of_birth", "gender", "preferred_language"].includes(k) ? null : v]));
    try {
      await api.put("/portal/profile", payload);
      setLang(form.preferred_language as Lang);
      setMsg({ kind: "success", text: "Profile saved." });
      reload();
    } catch (err) {
      const e2 = err as { response?: { data?: { errors?: Record<string, string[]> } } };
      setFieldErrors(Object.fromEntries(Object.entries(e2.response?.data?.errors ?? {}).map(([k, v]) => [k, v[0]])));
      setMsg({ kind: "error", text: apiError(err, "Could not save your profile.") });
    } finally { setSaving(false); }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || !form) return <div className="mx-auto max-w-3xl"><ListSkeleton rows={4} /></div>;

  const txt = (k: string, label: string, extra: { type?: string; className?: string; hint?: string; required?: boolean; max?: string } = {}) => (
    <Field label={label} hint={extra.hint} error={fieldErrors[k]} className={extra.className}>
      {(p) => <input {...p} type={extra.type ?? "text"} value={form[k]} onChange={set(k)} required={extra.required} max={extra.max} className={inputCls} />}
    </Field>
  );
  const area = (k: string, label: string, hint?: string) => (
    <Field label={label} hint={hint} error={fieldErrors[k]} className="sm:col-span-2">{(p) => <textarea {...p} rows={2} maxLength={2000} value={form[k]} onChange={set(k)} className={inputCls} />}</Field>
  );
  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5" noValidate>
      <PageHeader title={t("Profile")} subtitle={`Medical record number ${data.patient.mrn}`} actions={<button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : t("Save changes")}</button>} />
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <div className={`${cardCls} flex items-center gap-5 p-6`}>
        <ProfileAvatar name={user?.name ?? "Profile"} className="h-20 w-20 rounded-full bg-[var(--primary)] font-heading text-2xl font-semibold text-white" />
        <div><p className="font-heading text-lg font-semibold">{data.patient.first_name} {data.patient.last_name}</p><p className="mb-2 text-sm text-[var(--muted)]">{data.patient.email}</p><AvatarUploadButton /></div>
      </div>

      <Section title={t("Personal information")}>
        {txt("first_name", "First name", { required: true })}
        {txt("last_name", "Last name", { required: true })}
        {txt("date_of_birth", t("Date of birth"), { type: "date", required: true })}
        <Field label={t("Gender")} error={fieldErrors.gender}>{(p) => <select {...p} value={form.gender} onChange={set("gender")} className={inputCls}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>}</Field>
        {txt("phone", t("Phone"), { type: "tel", required: true })}
        <Field label={t("Language")} hint="Used for the portal and your emails.">{(p) => <select {...p} value={form.preferred_language} onChange={set("preferred_language")} className={inputCls}><option value="en">English</option><option value="az">Azərbaycanca</option><option value="ru">Русский</option></select>}</Field>
        {area("address", t("Address"))}
      </Section>

      <Section title={t("Medical information")}>
        <Field label={t("Blood type")}>{(p) => <select {...p} value={form.blood_type} onChange={set("blood_type")} className={inputCls}><option value="">Not set</option>{BLOOD.map((b) => <option key={b}>{b}</option>)}</select>}</Field>
        <div className="hidden sm:block" />
        {area("allergies", t("Allergies"), "Medicines, foods, latex… Your doctors see this on every visit.")}
        {area("chronic_conditions", t("Chronic conditions"), "For example: diabetes, asthma, hypertension.")}
        {area("current_medications", t("Current medications"), "Name and dose, one per line.")}
      </Section>

      <Section title={t("Emergency contact")}>
        {txt("emergency_contact_name", "Full name")}
        {txt("emergency_contact_relation", "Relationship")}
        {txt("emergency_contact_phone", t("Phone"), { type: "tel" })}
      </Section>

      <Section title={t("Insurance")}>
        {txt("insurance_provider", "Insurance company")}
        {txt("insurance_policy_number", "Policy / member number", { hint: "Stored encrypted." })}
        {txt("insurance_group_number", "Group number")}
        {txt("insurance_expires_on", "Valid until", { type: "date" })}
      </Section>

      <div className="flex justify-end"><button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : t("Save changes")}</button></div>
    </form>
  );
}
