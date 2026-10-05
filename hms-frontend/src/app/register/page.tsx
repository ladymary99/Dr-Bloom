"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const initialForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "male",
  password: "",
  password_confirmation: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/patient/register", form);
      setAuth(data);
      router.push("/portal");
    } catch (requestError) {
      const data = (requestError as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      }).response?.data;
      const firstError = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
      setError(firstError ?? data?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-lg border-y border-slate-200 bg-white px-5 py-7 sm:border sm:px-8 sm:py-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 font-bold text-white">D</div>
          <div>
            <div className="text-lg font-semibold text-slate-900">Dr-Bloom Hospital</div>
            <div className="text-sm text-slate-500">Patient registration</div>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-slate-900">Create your patient account</h1>
        <p className="mt-1 text-sm text-slate-500">Use your details to access appointments and records.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="first-name" className="mb-1 block text-sm font-medium text-slate-700">First name</label>
              <input id="first-name" required maxLength={100} autoComplete="given-name" className={inputClass} value={form.first_name}
                onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
            </div>
            <div>
              <label htmlFor="last-name" className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
              <input id="last-name" required maxLength={100} autoComplete="family-name" className={inputClass} value={form.last_name}
                onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input id="email" required type="email" maxLength={255} autoComplete="email" className={inputClass} value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input id="phone" required type="tel" maxLength={20} autoComplete="tel" className={inputClass} value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="date-of-birth" className="mb-1 block text-sm font-medium text-slate-700">Date of birth</label>
              <input id="date-of-birth" required type="date" autoComplete="bday" className={inputClass} value={form.date_of_birth}
                onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} />
            </div>
            <div>
              <label htmlFor="gender" className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
              <select id="gender" className={inputClass} value={form.gender}
                onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input id="password" required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </div>
          <div>
            <label htmlFor="password-confirmation" className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
            <input id="password-confirmation" required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={form.password_confirmation}
              onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} />
          </div>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-blue-700 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already registered? <Link href="/login" className="font-medium text-blue-700 hover:underline">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
