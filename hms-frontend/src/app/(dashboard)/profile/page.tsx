"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

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

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <div className="max-w-3xl">
      <header className="mb-7">
        <p className="text-sm font-medium text-blue-700">Account</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">My Profile</h1>
      </header>

      <section className="border-y border-slate-200 bg-white px-5 py-6 sm:px-7">
        <h2 className="text-base font-semibold text-slate-900">Profile details</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Name</dt>
            <dd className="mt-1 text-sm text-slate-900">{user?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Email</dt>
            <dd className="mt-1 break-all text-sm text-slate-900">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">Role</dt>
            <dd className="mt-1 text-sm capitalize text-slate-900">{roles.join(", ") || "—"}</dd>
          </div>
          {user?.staff_profile?.specialization && (
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Specialization</dt>
              <dd className="mt-1 text-sm text-slate-900">{user.staff_profile.specialization}</dd>
            </div>
          )}
          {user?.staff_profile?.department && (
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Department</dt>
              <dd className="mt-1 text-sm text-slate-900">{user.staff_profile.department.name}</dd>
            </div>
          )}
          {user?.staff_profile?.position && (
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Position</dt>
              <dd className="mt-1 text-sm capitalize text-slate-900">{user.staff_profile.position}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-8 border-y border-slate-200 bg-white px-5 py-6 sm:px-7">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-slate-900">Change password</h2>
          <p className="mt-1 text-sm text-slate-500">Other signed-in devices will be logged out after the change.</p>
        </div>
        <form onSubmit={submit} className="max-w-xl space-y-4">
          <div>
            <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-slate-700">Current password</label>
            <input id="current-password" type="password" autoComplete="current-password" required className={inputClass}
              value={form.current_password} onChange={(event) => setForm({ ...form, current_password: event.target.value })} />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required className={inputClass}
              value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required className={inputClass}
              value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} />
          </div>

          {message && <p role="status" className="text-sm text-green-700">{message}</p>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {saving ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}