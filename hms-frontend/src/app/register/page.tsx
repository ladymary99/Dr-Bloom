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
  accept_privacy: false,
};

/* ---------- split-screen auth shell — same as login ---------- */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen gap-4 bg-[var(--primary-tint)]/20 p-4">
      {/* left — white panel with the form */}
      <div className="flex flex-1 items-center justify-center rounded-3xl bg-white px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>

      {/* right — gradient panel with the layered shield emblem */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-[var(--primary)] via-[var(--muted)] to-[var(--primary-tint)] lg:flex">
        <div className="absolute flex items-center justify-center">
          {/* nested translucent shields, like the image */}
          <div className="absolute h-[560px] w-[560px] rounded-[30%] border border-white/10" />
          <div className="absolute h-[430px] w-[430px] rounded-[28%] border border-white/15 bg-white/5 backdrop-blur-sm" />
          <div className="absolute h-[310px] w-[310px] rounded-[26%] border border-white/20 bg-white/10 backdrop-blur-sm" />

          {/* main shield icon */}
          <div className="relative flex h-36 w-36 items-center justify-center rounded-[24%] bg-white/15 backdrop-blur-md">
            <svg
              viewBox="0 0 24 24"
              className="h-20 w-20 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" />
              <path d="M12 7v6M9 10.5h6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/patient/register", form);
      setAuth(data);
      const currentParams = new URLSearchParams(window.location.search);
      const bookingParams = new URLSearchParams();
      for (const key of ["doctor", "department"]) {
        const value = currentParams.get(key)?.trim();
        if (value) bookingParams.set(key, value);
      }
      const bookingQuery = bookingParams.toString();
      router.push(bookingQuery ? `/portal/book?${bookingQuery}` : "/portal");
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

  const inputClass =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary-tint)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";
  const labelClass =
    "mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]";

  return (
    <AuthShell>
      {/* logo row */}
      <div className="mb-8 flex items-center gap-2.5">
       
        <span className="font-heading text-xl font-semibold text-[var(--ink)]">Dr&apos;Bloom</span>
      </div>

      <h1 className="font-heading text-2xl font-bold text-[var(--ink)]">
        Create an account.
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Let&apos;s get you started. Use your details to access appointments and records.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="first-name" className={labelClass}>First name</label>
            <input
              id="first-name"
              required
              maxLength={100}
              autoComplete="given-name"
              className={inputClass}
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="last-name" className={labelClass}>Last name</label>
            <input
              id="last-name"
              required
              maxLength={100}
              autoComplete="family-name"
              className={inputClass}
              value={form.last_name}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input
            id="email"
            required
            type="email"
            maxLength={255}
            autoComplete="email"
            placeholder="name@gmail.com"
            className={inputClass}
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>Phone</label>
          <input
            id="phone"
            required
            type="tel"
            maxLength={20}
            autoComplete="tel"
            className={inputClass}
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date-of-birth" className={labelClass}>Date of birth</label>
            <input
              id="date-of-birth"
              required
              type="date"
              autoComplete="bday"
              className={inputClass}
              value={form.date_of_birth}
              onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="gender" className={labelClass}>Gender</label>
            <select
              id="gender"
              className={inputClass}
              value={form.gender}
              onChange={(event) => setForm({ ...form, gender: event.target.value })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input
            id="password"
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="password-confirmation" className={labelClass}>Confirm password</label>
          <input
            id="password-confirmation"
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
            value={form.password_confirmation}
            onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            required
            checked={form.accept_privacy}
            onChange={(event) => setForm({ ...form, accept_privacy: event.target.checked })}
            className="mt-1 h-4 w-4"
          />
          <span>
            I agree that Dr&apos;Bloom may store and process my health information to provide my care, as described in the privacy policy. I can download or request deletion of my data at any time.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-[var(--primary-tint)]/25 px-4 py-2.5 text-sm text-[var(--primary)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--primary)] py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--primary)]/85 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-[var(--muted)]">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}