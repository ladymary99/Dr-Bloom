"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Info = { hospital_name: string; doctors: number; departments: number };

/* shared icon style — same as the services page */
const iconProps = {
  className: "h-6 w-6",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const values = [
  {
    icon: <svg {...iconProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/><path d="M7 12h3l1.5-3 2 5L15 12h2"/></svg>,
    title: "Patient first",
    text: "Every decision starts with what is best for the patient. One missed detail in your care can cost you your health — we never let that happen.",
  },
  {
    icon: <svg {...iconProps}><path d="M10 2v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8.5V2M8.5 2h7M7 16h10"/></svg>,
    title: "Evidence-based",
    text: "Modern diagnostics and treatments, continuously updated. We explain every option in plain language so you can decide with confidence.",
  },
  {
    icon: <svg {...iconProps}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>,
    title: "Transparency",
    text: "Clear billing, online records, and honest communication. No hidden costs — you always know what your care involves.",
  },
  {
    icon: <svg {...iconProps}><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="m8.8 12 2.2 2.2 4.2-4.7"/></svg>,
    title: "Safety",
    text: "Strict protocols, audited access, and encrypted patient data. We monitor and improve our standards year after year.",
  },
];

/* ---------- count-up (same as homepage) ---------- */
function CountUp({ value, suffix, start }: { value: number; suffix?: string; start: boolean }) {
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf: number;
    const t0 = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(Math.max((t - t0) / dur, 0), 1);
      setP(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start]);

  const eased = 1 - Math.pow(1 - p, 3);
  const n = Math.round(eased * value);

  return (
    <span
      className="inline-block will-change-transform"
      style={{
        filter: `blur(${(1 - eased) * 10}px)`,
        transform: `translateY(${(1 - eased) * 18}px)`,
        opacity: 0.2 + eased * 0.8,
      }}
    >
      {n}
      {suffix}
    </span>
  );
}

/* ---------- number section (same as homepage) ---------- */
function StatsStrip({ info }: { info: Info | null }) {
  const ref = useRef<HTMLElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStart(true); obs.disconnect(); } },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const stats = [
    { icon: <Image src="/1.svg" alt="" width={60} height={60} className="h-15 w-15" />, value: 24, suffix: "/7", label: "Emergency & Critical Care" },
    { icon: <Image src="/4.svg" alt="" width={60} height={60} className="h-15 w-15" />, value: 100, suffix: "K+", label: "Patients Served" },
    { icon: <Image src="/3.svg" alt="" width={60} height={60} className="h-15 w-15" />, value: info?.doctors ?? 50, suffix: "+", label: "Medical Specialists" },
    { icon: <Image src="/2.svg" alt="" width={60} height={60} className="h-15 w-15" />, value: info?.departments ?? 12, suffix: "+", label: "Specialized Departments" },
  ];

  return (
    <section ref={ref}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 justify-items-center gap-x-1 gap-y-5 px-4 py-14 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[var(--primary)]">
              {s.icon}
            </div>
            <div>
              <div className="font-heading text-3xl font-bold tabular-nums text-[var(--primary)]">
                <CountUp value={s.value} suffix={s.suffix} start={start} />
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- values panel — like the image, left column sticky ---------- */
function ValuesPanel() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="px-4 py-16">
      <div
        className="mx-auto max-w-6xl rounded-3xl bg-gradient-to-b from-[var(--primary-tint)]/20 via-[var(--primary-tint)]/30 to-[var(--primary-tint)]/50 p-8 transition-all duration-1000 ease-out sm:p-14"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)" }}
      >
        <div className="grid gap-14 md:grid-cols-2">
          {/* left column — sticky while the right side scrolls */}
          <div className="md:sticky md:top-24 md:self-start">
            <h2 className="font-heading max-w-md text-4xl font-bold leading-[1.15] tracking-tight text-[var(--ink)] sm:text-5xl">
              You heal.<br />We support.
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
              Patients and their families deserve straightforward healthcare experiences
              that save time and reduce risk. That belief shapes everything we do.
            </p>
          </div>

          {/* right column — values with bare muted icons */}
          <div>
            {values.map((v, i) => (
              <div
                key={v.title}
                className={`flex gap-6 py-10 transition-all duration-700 ease-out ${
                  i > 0 ? "border-t border-white/50" : ""
                }`}
                style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(32px)", transitionDelay: `${200 + i * 150}ms` }}
              >
                <div className="shrink-0 pt-2 text-[var(--muted)]">
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-heading pt-1 text-2xl font-semibold text-[var(--ink)]">
                    {v.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
                    {v.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    api.get("/public/info").then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Mission — like the image */}
      <section className="mx-auto max-w-6xl px-4 pt-20">
        <div className="grid items-start gap-12 md:grid-cols-2">
          <h1 className="font-heading max-w-xl text-4xl font-bold leading-[1.15] tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
            Our mission is simple: better care for every patient through smarter healthcare.
          </h1>

          <div className="md:pt-4">
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">
              Why we started Dr&apos;Bloom
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
              We saw firsthand how fragmented hospital care can be — patients repeating their
              history at every desk, waiting on paper records, and never knowing what their
              treatment would cost. That outdated way of running a hospital costs patients
              time, money, and peace of mind.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
              With backgrounds in healthcare and technology, we built Dr&apos;Bloom to change
              that. One connected system links our emergency team, specialists, laboratory, and
              pharmacy — reducing waiting times and keeping your care consistent from your
              first consultation to full recovery.
            </p>
          </div>
        </div>

        {/* large rounded image */}
        <div className="mt-16 overflow-hidden rounded-3xl">
          <Image
            src="/about.webp"
            alt="Inside Dr&apos;Bloom Hospital"
            width={1200}
            height={460}
            className="h-[380px] w-full object-cover sm:h-[460px]"
          />
        </div>
      </section>

      {/* Number section — from the homepage */}
      <StatsStrip info={info} />

      {/* Values panel — sticky left column */}
      <ValuesPanel />

    </div>
  );
}