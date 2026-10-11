"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const FIELDS: { key: string; label: string; multiline?: boolean; placeholder?: string }[] = [
  { key: "hospital_name", label: "Hospital name" },
  { key: "address", label: "Address", multiline: true },
  { key: "phone", label: "Phone", placeholder: "+93 ..." },
  { key: "email", label: "Email" },
  { key: "working_hours", label: "Working hours", placeholder: "Sat–Thu, 8:00 – 20:00" },
  { key: "announcement", label: "Announcement banner", multiline: true, placeholder: "Shown to all staff on the dashboard (optional)" },
  { key: "consultation_fee", label: "Consultation fee (online bookings)", placeholder: "e.g. 10" },
];

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

export default function SettingsPage() {
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = roles.includes("admin");

  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings").then((r) => setForm(r.data));
  }, []);

  async function submit() {
    if (!form) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await api.put("/settings", form);
      setSaved(true);
    } catch (requestError) {
      const data = (requestError as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      }).response?.data;
      setError(data?.errors ? Object.values(data.errors).flat()[0] : data?.message ?? "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
          <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <p className="mt-3 text-sm font-medium text-[var(--ink)]">Only admins can change hospital settings.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Hospital Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">This info appears on invoices, receipts, and staff screens.</p>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-7">
        {!form ? (
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="mb-1 h-3.5 w-28 animate-pulse rounded bg-[var(--primary-tint)]/20" />
                <div className="h-10 animate-pulse rounded-xl bg-[var(--primary-tint)]/15" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-sm font-medium text-[var(--ink)]">{f.label}</label>
                {f.multiline ? (
                  <textarea rows={2} className={inputCls} placeholder={f.placeholder}
                    value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <input className={inputCls} placeholder={f.placeholder}
                    value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </div>
            ))}

            {saved && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
                <svg {...iconProps} className="h-4 w-4 flex-none"><path d="M20 6 9 17l-5-5"/></svg>
                Settings saved.
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                <svg {...iconProps} className="h-4 w-4 flex-none"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                {error}
              </div>
            )}

            <button onClick={submit} disabled={saving}
              className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}