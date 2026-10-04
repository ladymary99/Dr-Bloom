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
];

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
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
        Only admins can change hospital settings.
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Hospital Settings</h1>
        <p className="mt-1 text-sm text-slate-500">This info appears on invoices, receipts, and staff screens.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {!form ? (
          <div className="p-8 text-center text-slate-500">Loading…</div>
        ) : (
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
                {f.multiline ? (
                  <textarea rows={2} className={inputCls} placeholder={f.placeholder}
                    value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <input className={inputCls} placeholder={f.placeholder}
                    value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </div>
            ))}

            {saved && <div className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">✓ Settings saved.</div>}
            {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

            <button onClick={submit} disabled={saving}
              className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}