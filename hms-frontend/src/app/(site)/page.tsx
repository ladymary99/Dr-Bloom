"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Info = { hospital_name: string; doctors: number; departments: number };

/* every section: 46px top/bottom, 24px left/right */
const SECTION = "px-6 py-[46px]";
const H2 = "font-heading text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl lg:text-5xl";

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
    <section ref={ref} className={SECTION}>
      <div className="mx-auto grid max-w-6xl grid-cols-2 justify-items-center gap-x-4 gap-y-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[var(--primary)]">
              {s.icon}
            </div>
            <div>
              <div className="font-heading text-2xl font-bold tabular-nums text-[var(--primary)] sm:text-3xl">
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

/* shared: reveal a section when it scrolls into view */
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

const norm = (s: string) => s.toLowerCase().trim();

/* ---------- departments (3 cards from the database) ---------- */
type Dept = { id: number; name: string; code: string; description: string | null };

const fallbackDepts: (Dept & { services: string[] })[] = [
  { id: 1, name: "Cardiology", code: "CAR", services: ["ECG & Echo", "Stress tests", "Heart clinic"], description: "Comprehensive heart and cardiovascular care — from routine ECGs and stress tests to long-term management of blood pressure, cholesterol and heart disease." },
  { id: 2, name: "Neurology", code: "NEU", services: ["Migraine care", "Epilepsy", "Stroke recovery"], description: "Expert diagnosis and treatment of neurological conditions, including migraines, epilepsy, stroke recovery and disorders of the brain, spine and nervous system." },
  { id: 3, name: "Pediatrics", code: "PED", services: ["Newborn care", "Vaccination", "Growth checks"], description: "Specialized healthcare for children and adolescents — newborn checks, vaccinations, growth tracking and treatment of childhood illnesses in a child-friendly setting." },
];

const iconProps = {
  className: "h-7 w-7",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const deptIcons: [string[], React.ReactNode][] = [
  [["cardio"], <svg key="cardio" {...iconProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/><path d="M7 12h3l1.5-3 2 5L15 12h2"/></svg>],
  [["neuro"], <svg key="neuro" {...iconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>],
  [["pediat", "paediat", "child"], <svg key="ped" {...iconProps}><circle cx="12" cy="8" r="4"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/></svg>],
  [["ortho"], <svg key="ortho" {...iconProps}><path d="M17 10c.7-.7 1.7-1 2.5-.5a2.5 2.5 0 1 0-3-3c-.5-.8-.2-1.8.5-2.5a2.5 2.5 0 1 0-3 3L7 14c-.7.7-1.7 1-2.5.5a2.5 2.5 0 1 0 3 3c.5.8.2 1.8-.5 2.5a2.5 2.5 0 1 0 3-3z"/></svg>],
  [["emer"], <svg key="emer" {...iconProps}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>],
  [["radio", "imaging"], <svg key="radio" {...iconProps}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></svg>],
  [["lab", "patholog"], <svg key="lab" {...iconProps}><path d="M10 2v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8.5V2M8.5 2h7M7 16h10"/></svg>],
  [["onco", "cancer"], <svg key="onco" {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>],
  [["women", "obstet", "gyn"], <svg key="women" {...iconProps}><circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 18h6"/></svg>],
  [["surg"], <svg key="surg" {...iconProps}><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="m8.8 12 2.2 2.2 4.2-4.7"/></svg>],
];

function iconFor(name: string) {
  const n = name.toLowerCase();
  for (const [keys, icon] of deptIcons) {
    if (keys.some((k) => n.includes(k))) return icon;
  }
  return deptIcons[0][1];
}

function DepartmentsSection() {
  const { ref, visible } = useReveal(0.1);
  const [depts, setDepts] = useState<Dept[] | null>(null);

  useEffect(() => {
    api
      .get("/departments")
      .then((r) => setDepts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDepts([]));
  }, []);

  const list = depts === null ? null : (depts.length ? depts : fallbackDepts).slice(0, 3);

  /* mobile: 1 col · tablet: 2 cols (3rd card full width) · desktop: 3 cols */
  const grid = "mt-10 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-8";
  const cell = "sm:last:col-span-2 lg:last:col-span-1";

  return (
    <section ref={ref} className={SECTION}>
      <div className="mx-auto max-w-6xl">
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className={H2}>Our departments</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            Specialist care for every stage of life — from routine checkups to
            emergencies, all connected under one roof and one patient record.
          </p>
        </div>

        <div className={grid}>
          {list === null
            ? [0, 1, 2].map((i) => (
                <div key={i} className={`${cell} min-h-[320px] animate-pulse rounded-3xl bg-[var(--primary-tint)]/20`} />
              ))
            : list.map((d, i) => {
                const meta = fallbackDepts.find((f) => norm(f.code) === norm(d.code) || norm(f.name) === norm(d.name));
                const services = meta?.services ?? ["Consultations", "Diagnostics", "Follow-up care"];
                return (
                  <div
                    key={`${d.code}-${d.id}`}
                    className={`${cell} flex min-h-[340px] flex-col overflow-hidden rounded-3xl bg-[var(--primary-tint)]/25 p-6 transition-all duration-700 ease-out lg:min-h-[380px] lg:p-8`}
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? "none" : "translateY(40px)",
                      transitionDelay: `${200 + i * 150}ms`,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-[var(--muted)]">{iconFor(d.name)}</div>
                      <span className="rounded-full bg-white/60 px-3 py-1 font-mono text-[11px] text-[var(--muted)]">
                        {d.code}
                      </span>
                    </div>
                    <h3 className="font-heading mt-6 text-xl font-semibold leading-snug text-[var(--ink)] lg:mt-8">
                      {d.name}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                      {d.description ?? meta?.description ?? "Consultations, diagnostics and treatment from our specialist team."}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-6">
                      {services.map((c) => (
                        <span key={c} className="rounded-full bg-white/60 px-3 py-1 text-[10px] text-[var(--muted)]">
                          {c}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/doctors?department=${encodeURIComponent(d.name)}`}
                      className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary)] transition-all hover:gap-3"
                    >
                      See doctors
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </Link>
                  </div>
                );
              })}
        </div>

        <div
          className="mt-10 text-center transition-all duration-700 ease-out lg:mt-14"
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
              <span className="r1">See all departments</span>
              <span className="r2" aria-hidden="true">See all departments</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- specialist doctors ---------- */
type Doctor = {
  id?: number;
  name: string;
  specialization: string | null;
  department: string | null;
  photo?: string | null;
  photo_url?: string | null;
  image?: string | null;
};

const fallbackDoctors: Doctor[] = [
  { name: "Dr. Sarah Khan", specialization: "Cardiologist", department: "Cardiology" },
  { name: "Dr. Omar Rahimi", specialization: "Neurologist", department: "Neurology" },
  { name: "Dr. Maya Anderson", specialization: "Pediatrician", department: "Pediatrics" },
  { name: "Dr. Daniel Wilson", specialization: "Orthopedic Surgeon", department: "Orthopedics" },
];

const doctorPhotos = ["/doc1.webp", "/doc2.webp", "/doc3.webp", "/doc4.webp"];

const demoPhotos: Record<string, string> = Object.fromEntries(
  fallbackDoctors.map((d, i) => [norm(d.name), doctorPhotos[i]])
);
const photoFor = (d: Doctor) => d.photo ?? d.photo_url ?? d.image ?? demoPhotos[norm(d.name)] ?? null;

const initialsOf = (name: string) =>
  name
    .replace(/^dr\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

function DoctorCard({ d, isCopy }: { d: Doctor; isCopy: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = failed ? null : photoFor(d);
  const dept = d.department?.trim() || "General";
  const spec = d.specialization ?? "Specialist";

  return (
    <Link
      href={`/doctors?department=${encodeURIComponent(dept)}`}
      aria-hidden={isCopy || undefined}
      tabIndex={isCopy ? -1 : undefined}
      className="group relative mr-4 h-[320px] w-[240px] flex-none overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-b from-white to-[var(--primary-tint)]/20 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-[var(--primary-tint)] hover:shadow-xl hover:shadow-[var(--primary-tint)]/30 sm:mr-5 sm:h-[340px] sm:w-[260px]"
    >
      {photo ? (
        <img
          src={photo}
          alt={isCopy ? "" : d.name}
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-start justify-center overflow-hidden bg-gradient-to-br from-[var(--primary-tint)]/50 to-[var(--primary-tint)]/15 pt-16">
          <span className="font-heading text-7xl font-bold tracking-tight text-[var(--primary)]/70">
            {initialsOf(d.name)}
          </span>
        </div>
      )}

      {/* solid block, bottom-left — same style as the hero blocks */}
      <div className="absolute bottom-0 left-0 w-[86%] rounded-[20px_20px_20px_0] bg-[var(--primary-tint)] px-5 pb-4 pt-4">
        <div className="font-heading truncate text-sm font-semibold text-[var(--primary)]">{d.name}</div>
        <div className="mt-1 truncate text-[11px] text-[var(--muted)]">{spec}</div>
      </div>
    </Link>
  );
}

function DoctorsSection() {
  const { ref, visible } = useReveal(0.1);
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);

  useEffect(() => {
    api
      .get("/public/doctors")
      .then((r) => setDoctors(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDoctors([]));
  }, []);

  const list = doctors === null ? null : (doctors.length ? doctors : fallbackDoctors).slice(0, 12);

  const base: Doctor[] = list
    ? Array.from({ length: Math.max(1, Math.ceil(8 / list.length)) }, () => list).flat()
    : [];
  const track = [...base, ...base];
  const duration = `${Math.max(base.length, 1) * 7}s`;

  return (
    <section ref={ref} className={`${SECTION} overflow-hidden`}>
      <style>{`
        @keyframes drMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .dr-track { display: flex; width: max-content; animation: drMarquee var(--dur, 60s) linear infinite; will-change: transform; }
        .dr-wrap:hover .dr-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .dr-track { animation: none; }
          .dr-wrap { overflow-x: auto; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl">
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className={H2}>Our specialist doctors</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            Certified specialists from every department — available for in-person
            consultations and online video visits.
          </p>
        </div>

        {/* carousel — slides slowly right to left, pauses on hover (no side fade) */}
        <div
          className="dr-wrap mt-10 overflow-hidden py-3 transition-all duration-1000 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(30px)" }}
        >
          {list === null ? (
            <div className="flex">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="mr-4 h-[320px] w-[240px] flex-none animate-pulse rounded-3xl bg-[var(--primary-tint)]/20 sm:mr-5 sm:h-[340px] sm:w-[260px]" />
              ))}
            </div>
          ) : (
            <div className="dr-track" style={{ ["--dur" as string]: duration } as React.CSSProperties}>
              {track.map((d, i) => (
                <DoctorCard key={`${i}-${d.name}`} d={d} isCopy={i >= base.length} />
              ))}
            </div>
          )}
        </div>

        <div
          className="mt-10 text-center transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(24px)",
            transitionDelay: "400ms",
          }}
        >
          <Link
            href="/doctors"
            className="bg-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
          >
            <span className="roll">
              <span className="r1">See all doctors</span>
              <span className="r2" aria-hidden="true">See all doctors</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- about ---------- */
const aboutImage = "/7.webp";

function AboutSection() {
  const { ref, visible } = useReveal(0.15);

  return (
    <section ref={ref} className={`${SECTION} overflow-x-clip`}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div
          className="transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className={H2}>Why we started Dr&apos;Bloom</h2>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base lg:mt-8">
            We saw firsthand how fragmented hospital care can be — patients repeating their
            history at every desk, waiting on paper records, and never knowing what their
            treatment would cost. That outdated way of running a hospital costs patients time,
            money, and peace of mind.
          </p>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            With backgrounds in healthcare and technology, we built Dr&apos;Bloom to change that.
            One connected system links our emergency team, specialists, laboratory, and
            pharmacy — reducing waiting times and keeping your care consistent from your first
            consultation to full recovery.
          </p>
          <div className="mt-8">
            <Link
              href="/about"
              className="bg-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
            >
              <span className="roll">
                <span className="r1">About us</span>
                <span className="r2" aria-hidden="true">About us</span>
              </span>
            </Link>
          </div>
        </div>

        <div
          className="group relative mx-auto w-full max-w-[520px] px-3 transition-all duration-1000 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(40px)",
            transitionDelay: "200ms",
          }}
        >
          <div className="relative">
            <div
              aria-hidden="true"
              className={`absolute inset-0 rounded-[32px] bg-[var(--primary-tint)]/70 transition-transform duration-[1200ms] ease-out ${
                visible ? "-translate-x-2.5 -translate-y-2 -rotate-[5deg] group-hover:-rotate-[7deg]" : ""
              }`}
            />
            <div
              aria-hidden="true"
              className={`absolute inset-0 rounded-[32px] bg-[var(--primary)]/20 transition-transform duration-[1200ms] ease-out ${
                visible ? "translate-x-2.5 translate-y-2.5 rotate-[4deg] group-hover:rotate-[6deg]" : ""
              }`}
            />

            <div className="relative rounded-[28px] border border-white bg-white p-3 shadow-2xl shadow-[var(--primary)]/15 sm:p-4">
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={aboutImage}
                  alt="Dr'Bloom Hospital"
                  className="aspect-[5/4] w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
                />
              </div>
              <div className="mt-4 px-1 pb-1">
                <div className="font-heading text-lg font-medium leading-snug text-[var(--ink)] sm:text-xl">
                  One connected system
                  <br />
                  for your care
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- what makes us special — auto slider, simplified layout ---------- */
const specials = [
  {
    id: "01",
    title: "Advanced laboratory",
    desc: "Same-day diagnostic testing with modern analyzers — results go straight to your patient portal the moment they're verified.",
    img: "/1.webp",
  },
  {
    id: "02",
    title: "Smart patient portal",
    desc: "Appointments, lab results, e-prescriptions and visit history — everything about your care, in one secure place.",
    img: "/4.webp",
  },
  {
    id: "03",
    title: "24/7 emergency care",
    desc: "A coordinated emergency team with rapid triage and advanced monitoring — ready around the clock, every day of the year.",
    img: "/5.webp",
  },
  {
    id: "04",
    title: "Connected specialists",
    desc: "Multidisciplinary teams share one live record across departments, so every specialist sees the full picture of your health.",
    img: "/7.webp",
  },
];

function SpecialSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % specials.length), 5200);
    return () => clearInterval(id);
  }, [paused]);

  const current = specials[index];

  return (
    <section className={SECTION}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-center gap-4 lg:mb-10">
          <h2 className={`${H2} text-center`}>What makes us special</h2>
          <span className="mb-1 hidden rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--muted)] sm:block">
            {current.id} / 0{specials.length}
          </span>
        </div>

        <div
          className="grid gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary-tint)]/25 via-[var(--primary-tint)]/15 to-white p-4 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-stretch lg:gap-12 lg:p-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* image — on top for mobile/tablet, right on desktop */}
          <div className="relative order-1 aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-2xl shadow-[var(--primary)]/20 lg:order-2 lg:aspect-auto lg:h-[460px]">
            {specials.map((s, i) => (
              <img
                key={s.id}
                src={s.img}
                alt={s.title}
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1400ms] ease-out ${
                  i === index ? "scale-100 opacity-100" : "scale-110 opacity-0"
                }`}
              />
            ))}
          </div>

          {/* list + description */}
          <div className="order-2 flex flex-col justify-between gap-8 lg:order-1 lg:py-2">
            <ul className="space-y-3">
              {specials.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => setIndex(i)}
                    className={`group flex items-center gap-3 text-left transition-all duration-500 ${
                      i === index ? "translate-x-1" : "opacity-50 hover:opacity-80"
                    }`}
                  >
                    <span
                      className={`h-px transition-all duration-500 ${
                        i === index ? "w-8 bg-[var(--primary)]" : "w-4 bg-[var(--muted)] group-hover:w-6"
                      }`}
                    />
                    <span
                      className={`font-heading text-sm sm:text-base ${
                        i === index ? "font-semibold text-[var(--primary)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div>
              <p key={current.id} className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">
                {current.desc}
              </p>
              <Link
                href="/services"
                className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary)] transition-all hover:gap-3"
              >
                More info
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- emergency ---------- */
function EmergencySection() {
  const { ref, visible } = useReveal(0.2);

  const cell = "sm:last:col-span-2 lg:last:col-span-1";
  const card = `${cell} flex min-h-[220px] flex-col overflow-hidden rounded-3xl bg-[var(--primary-tint)]/25 p-6 transition-all duration-700 ease-out lg:min-h-[240px] lg:p-8`;

  return (
    <section ref={ref} className={SECTION}>
      <div className="mx-auto max-w-6xl">
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className={H2}>
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

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-6">
          <div className={card} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)", transitionDelay: "200ms" }}>
            <p className="text-sm text-[var(--muted)]">Emergency Department</p>
            <p className="font-heading mt-3 text-4xl font-bold text-[var(--primary)]">24/7</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Always open — walk-ins welcome</p>
            <div className="mt-auto pt-8 text-[var(--muted)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="m8.8 12 2.2 2.2 4.2-4.7"/>
              </svg>
            </div>
          </div>

          <div className={card} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)", transitionDelay: "350ms" }}>
            <p className="text-sm text-[var(--muted)]">Emergency Hotline</p>
            <p className="font-heading mt-3 break-words text-3xl font-bold text-[var(--primary)] sm:text-2xl xl:text-3xl">+93 700 000 000</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Call anytime, day or night</p>
            <div className="mt-auto pt-8 text-[var(--muted)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />
              </svg>
            </div>
          </div>

          <div className={card} style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)", transitionDelay: "500ms" }}>
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

        <div
          className="mt-10 flex flex-wrap justify-center gap-4 transition-all duration-700 ease-out lg:mt-12"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transitionDelay: "650ms" }}
        >
          <Link
            href="/contact"
            className="btn-roll inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3 text-xs uppercase tracking-[0.15em] text-white hover:bg-[var(--primary)]/85"
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

/* ---------- hero — photo + animated corner block, text inside ---------- */
function Hero() {
  return (
    <section className="hero-stage relative min-h-[max(100svh,640px)] overflow-hidden">
      <style>{`
        .hero-stage {
          container-type: inline-size;
          --blue: #b1c0ec;
          --r: clamp(18px, 3.5cqw, 44px);
          /* width of the block: mobile leaves a 24px gap on the right */
          --tl-w: calc(100% - 24px);
        }
        @media (min-width: 640px)  { .hero-stage { --tl-w: 82%; } }
        @media (min-width: 768px)  { .hero-stage { --tl-w: 70%; } }
        @media (min-width: 1024px) { .hero-stage { --tl-w: 56%; } }
        @media (min-width: 1280px) { .hero-stage { --tl-w: 52%; } }

        .hero-block {
          position: absolute;
          top: 0; left: 0;
          width: var(--tl-w);
          background: var(--blue);
          border-radius: 0 var(--r) var(--r) var(--r);
          overflow: hidden;
          /* height follows the content, so text never overflows on small screens */
          animation: heroGrow 1.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (min-width: 1024px) { .hero-block { min-height: 68%; } }

        /* grows out of the top-left corner */
        @keyframes heroGrow {
          from { clip-path: inset(0 100% 100% 0); }
          to   { clip-path: inset(0 0 0 0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-block { animation: none; }
        }
      `}</style>

      {/* photo — stays still */}
      <Image
        src="/6.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full select-none object-cover object-center"
      />

      {/* block, top-left — holds the text and button */}
      <div className="hero-block">
        <div className="px-6 pb-10 pt-12 sm:px-10 sm:pb-14 sm:pt-16 lg:px-12 lg:pb-20 lg:pt-24">
          <h1
            className="hero-anim font-heading max-w-2xl text-[2.5rem] font-bold leading-[1.05] tracking-tight text-[var(--primary)] sm:text-5xl lg:text-6xl xl:text-7xl"
            style={{ animationDelay: "0.8s" }}
          >
            Advanced healthcare.
          </h1>

          <p
            className="hero-anim mt-6 max-w-lg text-sm leading-relaxed text-[var(--muted)] sm:mt-8 sm:text-base lg:text-sm"
            style={{ animationDelay: "1s" }}
          >
            At Dr&apos;Bloom, we combine advanced medical technology, experienced specialists,
            and patient-centered care to deliver better healthcare outcomes at every
            stage of life.
          </p>

          <div
            className="hero-anim mt-7 flex flex-wrap items-center gap-5 sm:mt-9"
            style={{ animationDelay: "1.2s" }}
          >
            <Link
              href="/services"
              className="bg-[var(--primary)] text-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-7 py-3 text-xs uppercase sm:px-8"
            >
              <span className="roll">
                <span className="r1">Explore Our Services</span>
                <span className="r2" aria-hidden="true">Explore Our Services</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    api.get("/public/info").then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <Hero />
      <StatsStrip info={info} />
      <DepartmentsSection />
      <DoctorsSection />
      <AboutSection />
      <SpecialSlider />
      <EmergencySection />

      {/* FAQ */}
      <section className={SECTION}>
        <div className="mx-auto max-w-3xl">
          <h2 className={`${H2} text-center`}>Frequently asked questions</h2>

          <div className="mt-10 lg:mt-14">
            {faqs.map((f, i) => (
              <div key={i} className="border-t border-[var(--border)] last:border-b">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
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
                    <p className="pb-6 pr-8 text-sm leading-relaxed text-[var(--muted)] sm:pr-14">
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