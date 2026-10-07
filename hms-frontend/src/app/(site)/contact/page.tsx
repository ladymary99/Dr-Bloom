"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Info = { hospital_name: string; address: string; phone: string; email: string; working_hours: string };

/* SVG icons — same stroke style as the services/about icons */
const iconProps = {
  className: "h-6 w-6",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const contactItems = (info: Info | null) => [
  {
    icon: <svg {...iconProps}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    label: "Address",
    value: info?.address || "—",
  },
  {
    icon: <svg {...iconProps}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" /></svg>,
    label: "Phone",
    value: info?.phone || "—",
  },
  {
    icon: <svg {...iconProps}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>,
    label: "Email",
    value: info?.email || "—",
  },
  {
    icon: <svg {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
    label: "Working hours",
    value: info?.working_hours || "24/7 emergency",
  },
];

export default function ContactPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    api.get("/public/info").then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary-tint)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

  return (
    <section
      ref={ref}
      className="px-4 pb-24 pt-10"
    >
      {/* gradient panel — like the image */}
      <div
        className="mx-auto max-w-6xl rounded-3xl bg-gradient-to-b from-[var(--primary)] via-[var(--muted)] to-[var(--primary-tint)] p-6 transition-all duration-1000 ease-out sm:p-12"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)" }}
      >
        {/* header */}
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Contact us
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/80">
            Questions, appointments, or emergencies — we&apos;re here.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-2">
          {/* left: white info cards on the gradient */}
          <div className="space-y-4">
            {contactItems(info).map((c, i) => (
              <div
                key={c.label}
                className="flex items-center gap-5 rounded-3xl bg-white p-6 shadow-xl shadow-[var(--primary)]/10 transition-all duration-700 ease-out"
                style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(32px)", transitionDelay: `${200 + i * 120}ms` }}
              >
                <span className="shrink-0 text-[var(--muted)]">{c.icon}</span>
                <div>
                  <div className="font-heading text-sm font-semibold text-[var(--ink)]">{c.label}</div>
                  <div className="mt-0.5 text-sm text-[var(--muted)]">{c.value}</div>
                </div>
              </div>
            ))}

            {/* emergency notice — glass style on the gradient */}
            <div
              className="flex items-start gap-4 rounded-3xl border border-white/25 bg-white/10 p-6 text-sm text-white backdrop-blur-sm transition-all duration-700 ease-out"
              style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(32px)", transitionDelay: "700ms" }}
            >
              <svg {...iconProps} className="h-6 w-6 shrink-0"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>
              <p>
                <span className="font-semibold">Medical emergency?</span> Come straight to the ER or
                call {info?.phone || "our emergency line"} — no appointment needed.
              </p>
            </div>
          </div>

          {/* right: white form card on the gradient */}
          <div
            className="rounded-3xl bg-white p-8 shadow-xl shadow-[var(--primary)]/10 transition-all duration-700 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(32px)", transitionDelay: "350ms" }}
          >
            <h2 className="font-heading text-xl font-semibold text-[var(--ink)]">Send a message</h2>
            {sent ? (
              <div className="mt-6 rounded-2xl bg-[var(--primary-tint)]/25 px-4 py-8 text-center text-sm text-[var(--primary)]">
                ✓ Message received. For urgent matters, please call us directly.
              </div>
            ) : (
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => { e.preventDefault(); setSent(true); }}
              >
                <input
                  required
                  placeholder="Your name"
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  required
                  type="email"
                  placeholder="Your email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <textarea
                  required
                  rows={5}
                  placeholder="How can we help?"
                  className={inputCls}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <button
                  type="submit"
                  className="btn-roll w-full rounded-full bg-[var(--primary)] py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[var(--primary)]/85"
                >
                  <span className="roll">
                    <span className="r1">Send message</span>
                    <span className="r2" aria-hidden="true">Send message</span>
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}