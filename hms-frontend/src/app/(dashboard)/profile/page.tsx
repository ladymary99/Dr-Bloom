"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const [form, setForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const response = await api.put("/me/password", form);
      setMessage(response.data.message);
      setForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (requestError) {
      const data = (requestError as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      }).response?.data;
      setError(data?.errors ? Object.values(data.errors).flat()[0] : data?.message ?? "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  const details = [
    { label: "Name", value: user?.name },
    { label: "Email", value: user?.email },
    { label: "Role", value: roles.join(", ") || undefined, capitalize: true },
    { label: "Specialization", value: user?.staff_profile?.specialization },
    { label: "Department", value: user?.staff_profile?.department?.name },
    { label: "Position", value: user?.staff_profile?.position, capitalize: true },
  ].filter((d) => d.value);

  return (
    <div className="animate-fade-up max-w-3xl">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">My Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Your account details and password.</p>
      </header>

      {/* Profile card */}
      <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-[var(--primary-tint)]/20 font-heading text-2xl font-bold text-[var(--primary)]">
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-xl font-semibold text-[var(--ink)]">{user?.name ?? "—"}</h2>
            <p className="truncate text-sm text-[var(--muted)]">{user?.email ?? "—"}</p>
            {roles.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span key={r} className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-0.5 text-xs font-semibold capitalize text-[var(--primary)]">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <dl className="mt-6 grid gap-5 border-t border-[var(--border)]/60 pt-6 sm:grid-cols-2">
          {details.slice(1).map((d) => (
            <div key={d.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{d.label}</dt>
              <dd className={`mt-1 break-all text-sm text-[var(--ink)] ${d.capitalize ? "capitalize" : ""}`}>{d.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Change password */}
      <section className="mt-6 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-[var(--primary-tint)]/20 text-[var(--primary)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Change password</h2>
            <p className="text-xs text-[var(--muted)]">Other signed-in devices will be logged out after the change.</p>
          </div>
        </div>

        <form onSubmit={submit} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-[var(--ink)]">Current password</label>
            <input id="current-password" type="password" autoComplete="current-password" required className={inputCls}
              value={form.current_password} onChange={(event) => setForm({ ...form, current_password: event.target.value })} />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-[var(--ink)]">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required className={inputCls}
              value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-[var(--ink)]">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required className={inputCls}
              value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} />
          </div>

          {message && (
            <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {message}
            </div>
          )}
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
            {saving ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}