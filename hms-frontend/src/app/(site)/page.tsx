"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Info = { hospital_name: string; doctors: number; departments: number };

/* ---------- patient journey panel — dark, glow, morphing center card ---------- */
const floatPills = [
  { label: "AI Diagnosis",       value: "assisted",    className: "left-[7%] top-[24%]",          delay: "0s",   hide: "" },
  { label: "Digital Records",    value: "secure",      className: "left-[13%] bottom-[20%]",      delay: "0.9s", hide: "hidden md:block" },
  { label: "Remote Monitoring",  value: "connected",   className: "right-[7%] top-[28%]",         delay: "1.6s", hide: "" },
  { label: "Advanced Imaging",   value: "in-house",    className: "right-[11%] bottom-[18%]",     delay: "0.5s", hide: "hidden md:block" },
  { label: "Emergency Care",     value: "24/7",        className: "left-1/2 top-[10%] -translate-x-1/2", delay: "1.2s", hide: "hidden sm:block" },
];

const stages = [
  { tag: "Cardiology | Dr. Sarah Khan" },
  {
    title: "We found your doctor",
    cta: "Book appointment",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--primary-tint)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5.5"/>
      </svg>
    ),
  },
  {
    title: "Visit confirmed",
    sub: "Prescription sent to pharmacy",
    barLabel: "Recovery monitoring",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--primary-tint)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="m8.8 12 2.2 2.2 4.2-4.7"/>
      </svg>
    ),
  },
];

function PatientJourney() {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setStage((s) => (s + 1) % stages.length), 2400);
    return () => clearInterval(id);
  }, [on]);

  return (
    <section ref={ref} className="px-4 py-10">
      <div
        className="relative mx-auto h-[560px] max-w-6xl overflow-hidden rounded-3xl bg-[var(--primary)] transition-all duration-1000 ease-out"
        style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(48px)" }}
      >
        <div className="glow-pulse h-[640px] w-[640px]" />
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

        {floatPills.map((p, i) => (
          <div
            key={p.label}
            className={`absolute ${p.className} ${p.hide} whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/85 backdrop-blur-sm transition-all duration-700 ease-out`}
            style={{
              opacity: on ? 1 : 0,
              transform: on ? "none" : "translateY(24px)",
              transitionDelay: `${350 + i * 160}ms`,
              animation: `floaty 5.5s ease-in-out infinite`,
              animationDelay: p.delay,
            }}
          >
            {p.label} <span className="mx-1 text-white/40">|</span> <span className="text-white/60">{p.value}</span>
          </div>
        ))}

        <div className="absolute left-1/2 top-1/2 h-[220px] w-[300px] -translate-x-1/2 -translate-y-1/2">
          {stages.map((s, i) => (
            <div
              key={i}
              className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out"
              style={{
                opacity: stage === i ? 1 : 0,
                transform: stage === i ? "scale(1)" : "scale(0.9) translateY(12px)",
                pointerEvents: stage === i ? "auto" : "none",
              }}
            >
              {i === 0 ? (
                <div className="whitespace-nowrap rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm text-white shadow-xl backdrop-blur-md">
                  {s.tag}
                </div>
              ) : (
                <div className="w-full rounded-2xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-heading text-2xl font-semibold leading-tight text-white">
                      {s.title}
                    </h3>
                    {s.icon}
                  </div>
                  {s.sub && <p className="mt-1 text-sm text-white/70">{s.sub}</p>}
                  {s.cta && (
                    <button className="mt-7 flex w-full items-center justify-between rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-sm text-white transition hover:bg-white/25">
                      {s.cta} <span>→</span>
                    </button>
                  )}
                  {s.barLabel && (
                    <div className="mt-7">
                      <p className="text-xs text-white/60">{s.barLabel}</p>
                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full w-2/3 rounded-full bg-white/70" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

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

/* ---------- healthcare designed around you (3 cards) ---------- */
const advantages = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 14l3-3 2 2 4-4 3 3M8 2v4M16 2v4"/>
      </svg>
    ),
    title: "Advanced Medical Technology",
    text: "We use modern diagnostic and treatment technologies to help our specialists make faster, more informed decisions.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    title: "Expert Medical Specialists",
    text: "Our multidisciplinary teams work together across departments to provide comprehensive care for complex and everyday medical needs.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>
      </svg>
    ),
    title: "Connected Patient Care",
    text: "Your care is coordinated across departments, giving your medical team the information they need to provide consistent and informed treatment.",
  },
];

function AdvantageSection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className="font-heading text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Healthcare designed around you
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted)]">
            From diagnosis to recovery, Dr&apos;Bloom brings specialists, advanced technology,
            and connected healthcare together to make every step of your medical journey
            simpler, safer, and more personalized.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {advantages.map((a, i) => (
            <div
              key={a.title}
              onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              className="glow-card min-h-[380px] overflow-hidden rounded-3xl bg-[var(--primary-tint)]/25 p-8 transition-all duration-700 ease-out"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "none" : "translateY(40px)",
                transitionDelay: `${200 + i * 150}ms`,
              }}
            >
              <div className="text-[var(--muted)]">{a.icon}</div>
              <h3 className="font-heading mt-8 text-xl font-semibold leading-snug text-[var(--ink)]">
                {a.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                {a.text}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-14 text-center transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(24px)",
            transitionDelay: "700ms",
          }}
        >
          <Link
            href="/services"
            className="bg-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
          >
            <span className="roll">
              <span className="r1">Explore all services</span>
              <span className="r2" aria-hidden="true">Explore all services</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- emergency section — like the image ---------- */
function EmergencySection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        {/* heading with underlined word + subtitle */}
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className="font-heading text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            When every second matters,{" "}
            <span className="relative inline-block text-[var(--primary)]">
              we&apos;re here
              <span className="absolute -bottom-1 left-0 right-0 border-b-2 border-[var(--muted)]" />
              
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm text-[var(--muted)]">
            Our emergency care team is available 24 hours a day, 7 days a week, providing
            rapid assessment and coordinated medical care when you need it most.
          </p>
        </div>

        {/* 3 stat cards */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {/* card 1 — big number + icon */}
          <div
            className="flex min-h-[240px] flex-col rounded-3xl bg-[var(--primary-tint)]/25 p-8 transition-all duration-700 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)", transitionDelay: "200ms" }}
          >
            <p className="text-sm text-[var(--muted)]">Emergency Department</p>
            <p className="font-heading mt-3 text-4xl font-bold text-[var(--primary)]">24/7</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Always open — walk-ins welcome</p>
            <div className="mt-auto pt-8 text-[var(--muted)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="m8.8 12 2.2 2.2 4.2-4.7"/>
              </svg>
            </div>
          </div>

          {/* card 2 — hotline + icon */}
          <div
            className="flex min-h-[240px] flex-col rounded-3xl bg-[var(--primary-tint)]/25 p-8 transition-all duration-700 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)", transitionDelay: "350ms" }}
          >
            <p className="text-sm text-[var(--muted)]">Emergency Hotline</p>
            <p className="font-heading mt-3 text-4xl font-bold text-[var(--primary)]">+93 700 000 000</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Call anytime, day or night</p>
            <div className="mt-auto pt-8 text-[var(--muted)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />
              </svg>
            </div>
          </div>

          {/* card 3 — slider like the image */}
          <div
            className="flex min-h-[240px] flex-col rounded-3xl bg-[var(--primary-tint)]/25 p-8 transition-all duration-700 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)", transitionDelay: "500ms" }}
          >
            <p className="text-sm text-[var(--muted)]">Critical Care Response</p>
            <p className="font-heading mt-3 text-4xl font-bold text-[var(--primary)]">Immediate</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Triage and rapid assessment</p>
            <div className="mt-auto pt-8">
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>Standard</span>
                <span>Immediate</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/70 shadow-inner">
                <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#b2c2ea] to-[#8fa3d9]" />
              </div>
            </div>
          </div>
        </div>

        {/* buttons — dark + outline, like the image */}
        <div
          className="mt-12 flex flex-wrap justify-center gap-4 transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transitionDelay: "650ms" }}
        >
          <Link
            href="/contact"
            className="btn-roll inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3 text-xs  uppercase tracking-[0.15em] text-white  hover:bg-[var(--primary)]/85"
          >
            <span className="roll">
              <span className="r1">Emergency Information</span>
              <span className="r2" aria-hidden="true">Emergency Information</span>
            </span>
          </Link>
         
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ data ---------- */
const faqs = [
  { q: "How do I book an appointment?", a: "You can book an appointment online by selecting a department, doctor, and available time. You can also contact our hospital directly for assistance." },
  { q: "Do I need a referral to see a specialist?", a: "Some specialist services may require a referral, while others can be booked directly. Our appointment team can guide you based on your needs." },
  { q: "Can I access my laboratory results online?", a: "Yes. Available laboratory results can be accessed through your secure patient portal." },
  { q: "Does Dr'Bloom provide emergency care?", a: "Yes. Our emergency department operates 24 hours a day, 7 days a week." },
  { q: "Can I have an online consultation?", a: "Selected departments and specialists may offer online consultations depending on the medical service required." },
  { q: "How can I find the right doctor?", a: "You can browse our doctors by specialty, department, and area of expertise to find the appropriate specialist for your needs." },
];

export default function HomePage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    api.get("/public/info").then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero — clean design background + real HTML texts */}
      <section className="relative min-h-screen overflow-hidden">
        <Image
          src="/hero4.webp"
          alt=""
          fill
          className="absolute inset-0 h-full w-full select-none object-cover"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16 sm:px-12 sm:pt-24 lg:pt-32">
          <h1 className="font-heading max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight text-[var(--primary)] sm:text-6xl lg:text-7xl">
            Advanced healthcare.
          </h1>

          <p className="mt-8 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
            At Dr&apos;Bloom, we combine advanced medical technology, experienced specialists,
            and patient-centered care to deliver better healthcare outcomes at every
            stage of life.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-5">
           
            <Link
              href="/services"
              className="bg-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
            >
              <span className="roll">
                <span className="r1">Explore Our Services</span>
                <span className="r2" aria-hidden="true">Explore Our Services</span>
              </span>
            </Link>
          </div>

          
        </div>
      </section>

      {/* Stats — major-hospital numbers */}
      <StatsStrip info={info} />

      {/* Healthcare designed around you — 3 cards */}
      <AdvantageSection />

      {/* Smart healthcare panel */}
      <PatientJourney />

      {/* Emergency — like the image */}
      <EmergencySection />

      {/* FAQ — minimal border list */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-heading text-center text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Frequently asked questions
          </h2>

          <div className="mt-14">
            {faqs.map((f, i) => (
              <div key={i} className="border-t border-[var(--border)] last:border-b">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-2 py-3 text-left"
                >
                  <span className="text-[15px] text-[var(--muted)] transition-colors hover:text-[var(--ink)]">
                    {f.q}
                  </span>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--muted)]/40 text-[var(--muted)] transition-transform duration-300 ${
                      openFaq === i ? "rotate-45" : ""
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>

                <div
                  className={`grid transition-all duration-300 ease-out ${
                    openFaq === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-7 pr-14 text-sm leading-relaxed text-[var(--muted)]">
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}