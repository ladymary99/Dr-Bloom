"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

/* ---------- split-screen auth shell — like the image ---------- */
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen gap-4 bg-[var(--primary-tint)]/20 p-4">
      {/* left — white panel with the form */}
      <div className="flex flex-1 items-center justify-center rounded-3xl bg-white px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
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

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/login", { email, password });
      setAuth(data);
      router.push(data.roles?.includes("patient") ? "/portal" : "/dashboard");
    } catch (requestError) {
      const data = (requestError as { response?: { data?: { message?: string } } }).response?.data;
      setError(data?.message ?? "Login failed. Check the server.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary-tint)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";
  const labelCls =
    "mb-1 block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted)]";

  return (
    <AuthShell>
      {/* logo row */}
      <div className="mb-10 flex items-center gap-2.5">
       
        <span className="font-heading text-xl font-semibold text-[var(--ink)]">Dr&apos;Bloom</span>
      </div>

      <h1 className="font-heading text-2xl font-bold text-[var(--ink)]">
        Sign in to your account.
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Welcome back. Please enter your details.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@hospital.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputCls}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-[var(--primary-tint)]/25 px-4 py-2.5 text-sm text-[var(--primary)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--primary)] py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--primary)]/85 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Next"}
        </button>
      </form>

      <div className="mt-6 rounded-xl bg-[var(--primary-tint)]/20 px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
        <b className="text-[var(--ink)]">Demo accounts</b> — password:{" "}
        <code className="font-mono">password</code>
        <br />
        admin@hospital.test · sarah.doctor@hospital.test · nurse@hospital.test · reception@hospital.test
      </div>

      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        New patient?{" "}
        <Link href="/register" className="font-medium text-[var(--primary)] hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}