"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Info = { hospital_name: string; doctors: number; departments: number };

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

/* shown if the API has not returned departments */
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

/* [keywords matched against the department name, icon] — first match wins */
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
  return deptIcons[0][1]; // heart fallback
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

  return (
    <section ref={ref} className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className="font-heading text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Our departments
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted)]">
            Specialist care for every stage of life — from routine checkups to
            emergencies, all connected under one roof and one patient record.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {list === null
            ? [0, 1, 2].map((i) => (
                <div key={i} className="min-h-[380px] animate-pulse rounded-3xl bg-[var(--primary-tint)]/20" />
              ))
            : list.map((d, i) => {
                const meta = fallbackDepts.find((f) => norm(f.code) === norm(d.code) || norm(f.name) === norm(d.name));
                const services = meta?.services ?? ["Consultations", "Diagnostics", "Follow-up care"];
                return (
                  <div
                    key={`${d.code}-${d.id}`}
                    onMouseMove={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                      e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                    }}
                    className="glow-card flex min-h-[380px] flex-col overflow-hidden rounded-3xl bg-[var(--primary-tint)]/25 p-8 transition-all duration-700 ease-out"
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
                    <h3 className="font-heading mt-8 text-xl font-semibold leading-snug text-[var(--ink)]">
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
              <span className="r1">See all departments</span>
              <span className="r2" aria-hidden="true">See all departments</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- specialist doctors (4 cards from the database) ---------- */
type Doctor = {
  id?: number;
  name: string;
  specialization: string | null;
  department: string | null;
  photo?: string | null;
  photo_url?: string | null;
  image?: string | null;
};

/* shown if the API has not returned doctors */
const fallbackDoctors: Doctor[] = [
  { name: "Dr. Sarah Khan", specialization: "Cardiologist", department: "Cardiology" },
  { name: "Dr. Omar Rahimi", specialization: "Neurologist", department: "Neurology" },
  { name: "Dr. Maya Anderson", specialization: "Pediatrician", department: "Pediatrics" },
  { name: "Dr. Daniel Wilson", specialization: "Orthopedic Surgeon", department: "Orthopedics" },
];

const doctorPhotos = ["/doc1.webp", "/doc2.webp", "/doc3.webp", "/doc4.webp"];

/* demo portraits only for the demo doctors (matched by name); every other doctor uses
   their own photo from the backend, or a designed initials portrait */
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

function DoctorsSection() {
  const { ref, visible } = useReveal(0.1);
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);

  useEffect(() => {
    api
      .get("/public/doctors")
      .then((r) => setDoctors(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDoctors([]));
  }, []);

  const list = doctors === null ? null : (doctors.length ? doctors : fallbackDoctors).slice(0, 4);

  return (
    <section ref={ref} className="pb-24 pt-4">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="text-center transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className="font-heading text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Our specialist doctors
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted)]">
            Certified specialists from every department — available for in-person
            consultations and online video visits.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list === null
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[430px] animate-pulse rounded-3xl bg-[var(--primary-tint)]/20" />
              ))
            : list.map((d, i) => {
                const photo = photoFor(d);
                const dept = d.department?.trim() || "General";
                const spec = d.specialization ?? "Specialist";
                return (
                  <article
                    key={d.id ?? d.name}
                    className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-white transition-all duration-700 ease-out hover:-translate-y-1 hover:border-[var(--primary-tint)] hover:shadow-xl hover:shadow-[var(--primary-tint)]/30"
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? "none" : "translateY(40px)",
                      transitionDelay: `${200 + i * 150}ms`,
                    }}
                  >
                    {/* portrait + glass panel */}
                    <div className="relative h-80 overflow-hidden bg-gradient-to-br from-[var(--primary-tint)]/50 via-[var(--primary-tint)]/25 to-white">
                      {photo ? (
                        <img
                          src={photo}
                          alt={d.name}
                          className="h-full w-full object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-105"
                        />
                      ) : (
                        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--muted)]">
                          <span className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
                          <span className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10" />
                          <span className="font-heading relative text-7xl font-bold tracking-tight text-white/85">
                            {initialsOf(d.name)}
                          </span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

                      <span className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/60 px-3 py-1 text-[11px] font-medium text-[var(--ink)] backdrop-blur-md">
                        {dept}
                      </span>

                      <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/40 bg-white/60 p-4 shadow-lg backdrop-blur-md transition-transform duration-500 group-hover:-translate-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[var(--ink)]">{d.name}</div>
                            <div className="truncate text-xs text-[var(--muted)]">{spec}</div>
                          </div>
                          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/80 text-emerald-600">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 13 4 4L19 7"/>
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <Link
                        href={`/register?doctor=${encodeURIComponent(d.name)}&department=${encodeURIComponent(dept)}`}
                        className="btn-roll inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-xs  uppercase  text-white  "
                      >
                        <span className="roll">
                          <span className="r1">Book appointment</span>
                          <span className="r2" aria-hidden="true">Book appointment</span>
                        </span>
                      </Link>
                    </div>
                  </article>
                );
              })}
        </div>

        <div
          className="mt-14 text-center transition-all duration-700 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(24px)",
            transitionDelay: "800ms",
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

/* ---------- about — our story (left) + our work chart (right) ---------- */
/* Edit the values to your real share of work — they are turned into percentages automatically. */
const aboutSegments = [
  {
    title: "Emergency & Critical Care",
    lines: ["Emergency &", "Critical Care"],
    value: 28,
    icon: "emergency",
    text: "Rapid triage and coordinated care around the clock, every day of the year.",
  },
  {
    title: "Diagnostics & Laboratory",
    lines: ["Diagnostics", "& Laboratory"],
    value: 22,
    icon: "lab",
    text: "Same-day testing and imaging, with verified results sent straight to your patient portal.",
  },
  {
    title: "Specialist Care",
    lines: ["Specialist", "Care"],
    value: 50,
    icon: "specialist",
    text: "Consultations and follow-ups with our specialists in every department — with your full history already on file.",
  },
];

const aboutIcons: Record<string, React.ReactNode> = {
  emergency: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  lab: <path d="M10 2v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8.5V2M8.5 2h7M7 16h10" />,
  specialist: (
    <>
      <path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1M8 15a6 6 0 0 0 12 0v-3" />
      <circle cx="20" cy="10" r="2" />
    </>
  ),
};

/* label colour per slice position: vivid, mid, pale */
const aboutTextFill = ["#fff", "#fff", "var(--primary)"];

const CX = 200;
const CY = 200;
const HOLE = 62; // inner radius (white hole)
const OUTER = 150; // outer radius of every slice

/* point on a circle, angle in degrees measured clockwise from 12 o'clock */
const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
};
const f = (n: number) => n.toFixed(2);

/* ring-shaped slice between two angles */
const sector = (a0: number, a1: number, r0: number, r1: number) => {
  const p0 = pt(r1, a0), p1 = pt(r1, a1), p2 = pt(r0, a1), p3 = pt(r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${f(p0.x)} ${f(p0.y)} A${r1} ${r1} 0 ${large} 1 ${f(p1.x)} ${f(p1.y)} L${f(p2.x)} ${f(p2.y)} A${r0} ${r0} 0 ${large} 0 ${f(p3.x)} ${f(p3.y)} Z`;
};

function AboutSection() {
  const { ref, visible } = useReveal(0.15);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  /* gently cycles through the slices until the visitor hovers or touches the chart */
  useEffect(() => {
    if (paused || !visible) return;
    const id = setInterval(() => setActive((i) => (i + 1) % aboutSegments.length), 4800);
    return () => clearInterval(id);
  }, [paused, visible]);

  const total = aboutSegments.reduce((sum, g) => sum + g.value, 0);
  let acc = 0;
  const slices = aboutSegments.map((g, i) => {
    const a0 = (acc / total) * 360;
    acc += g.value;
    const a1 = (acc / total) * 360;
    const mid = (a0 + a1) / 2;
    return { ...g, i, a0, a1, mid, pct: Math.round((g.value / total) * 100) };
  });
  const arcStart = pt(190, 225);
  const arcEnd = pt(190, 359.9);
  const current = slices[active];

  return (
    <section ref={ref} className="py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 lg:grid-cols-2 lg:gap-10">
        {/* left: our story */}
        <div
          className="transition-all duration-700 ease-out"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
        >
          <h2 className="font-heading text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Why we started Dr&apos;Bloom
          </h2>
          <p className="mt-8 max-w-xl leading-relaxed text-[var(--muted)]">
            We saw firsthand how fragmented hospital care can be — patients repeating their
            history at every desk, waiting on paper records, and never knowing what their
            treatment would cost. That outdated way of running a hospital costs patients time,
            money, and peace of mind.
          </p>
          <p className="mt-5 max-w-xl leading-relaxed text-[var(--muted)]">
            With backgrounds in healthcare and technology, we built Dr&apos;Bloom to change that.
            One connected system links our emergency team, specialists, laboratory, and
            pharmacy — reducing waiting times and keeping your care consistent from your first
            consultation to full recovery.
          </p>
          <div className="mt-9">
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

        {/* right: our work — interactive donut chart */}
        <div
          className="mx-auto w-full max-w-[480px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative aspect-square w-full">
            <svg
              viewBox="0 0 400 400"
              className="h-full w-full overflow-visible"
              role="group"
              aria-label="Our work by area of care"
              style={{
                transformOrigin: "50% 50%",
                transform: visible ? "scale(1)" : "scale(0.82)",
                opacity: visible ? 1 : 0,
                transition: "transform 1.2s cubic-bezier(.2,.8,.2,1), opacity 1s ease-out",
              }}
            >
              <defs>
                {/* vivid */}
                <radialGradient id="aboutG0" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r="175">
                  <stop offset="0.35" style={{ stopColor: "var(--primary)", stopOpacity: 1 }} />
                  <stop offset="0.65" style={{ stopColor: "var(--primary)", stopOpacity: 0.8 }} />
                  <stop offset="1" style={{ stopColor: "var(--primary-tint)", stopOpacity: 0.95 }} />
                </radialGradient>
                {/* mid */}
                <radialGradient id="aboutG1" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r="175">
                  <stop offset="0.35" style={{ stopColor: "var(--primary)", stopOpacity: 0.85 }} />
                  <stop offset="1" style={{ stopColor: "var(--primary)", stopOpacity: 0.5 }} />
                </radialGradient>
                {/* pale */}
                <radialGradient id="aboutG2" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r="175">
                  <stop offset="0.35" style={{ stopColor: "var(--primary-tint)", stopOpacity: 0.85 }} />
                  <stop offset="1" style={{ stopColor: "var(--primary-tint)", stopOpacity: 0.35 }} />
                </radialGradient>
              </defs>

              {/* thin decorative outer arc */}
              <path
                d={`M${f(arcStart.x)} ${f(arcStart.y)} A190 190 0 0 1 ${f(arcEnd.x)} ${f(arcEnd.y)}`}
                fill="none"
                strokeWidth="1.5"
                style={{ stroke: "var(--primary-tint)", strokeOpacity: 0.8 }}
              />

              {/* slices */}
              {slices.map((g) => {
                const isActive = g.i === active;
                const out = isActive ? 12 : 0;
                const dx = out * Math.sin((g.mid * Math.PI) / 180);
                const dy = -out * Math.cos((g.mid * Math.PI) / 180);
                const c = pt((HOLE + OUTER) / 2 + 4, g.mid);
                return (
                  <g
                    key={g.title}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    aria-label={`${g.title}, ${g.pct}%`}
                    onMouseEnter={() => setActive(g.i)}
                    onFocus={() => setActive(g.i)}
                    onClick={() => setActive(g.i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActive(g.i);
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      outline: "none",
                      transform: `translate(${f(dx)}px, ${f(dy)}px)`,
                      transition: "transform 500ms cubic-bezier(.2,.8,.2,1), opacity 400ms ease, filter 400ms ease",
                      opacity: isActive ? 1 : 0.82,
                      filter: isActive ? "drop-shadow(0 10px 16px rgba(0,0,0,0.18))" : "none",
                    }}
                  >
                    <path
                      d={sector(g.a0, g.a1, HOLE, OUTER)}
                      fill={`url(#aboutG${g.i % 3})`}
                      stroke="#fff"
                      strokeWidth="2"
                      strokeOpacity="0.8"
                      strokeLinejoin="round"
                    />
                    {/* icon + label */}
                    <g
                      transform={`translate(${f(c.x - 11.4)} ${f(c.y - 30)}) scale(0.95)`}
                      fill="none"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ stroke: aboutTextFill[g.i % 3], pointerEvents: "none" }}
                    >
                      {aboutIcons[g.icon]}
                    </g>
                    <text
                      x={f(c.x)}
                      y={f(c.y + 6)}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="500"
                      style={{ fill: aboutTextFill[g.i % 3], pointerEvents: "none" }}
                    >
                      {g.lines.map((line, k) => (
                        <tspan key={line} x={f(c.x)} dy={k === 0 ? 0 : 13}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              })}

              {/* white center hole */}
              <circle
                cx={CX}
                cy={CY}
                r={HOLE - 1}
                fill="#fff"
                strokeWidth="1"
                style={{ stroke: "var(--primary-tint)", strokeOpacity: 0.5, pointerEvents: "none" }}
              />
            </svg>

            {/* center: share of the active slice */}
            <div
              key={active}
              className="anim-show pointer-events-none absolute left-1/2 top-1/2 w-[28%] -translate-x-1/2 -translate-y-1/2 text-center"
            >
              <div className="font-heading text-xl font-bold tabular-nums text-[var(--primary)] sm:text-3xl">
                {current.pct}%
              </div>
              <div className="text-[8px] text-[var(--muted)] sm:text-[10px]">of our work</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- patient portal showcase — auto-looping animated story ---------- */
const showcaseSteps = [
  { id: "01", title: "Your dashboard comes alive", desc: "Appointments, vitals and activity flow into one clean portal — updated live." },
  { id: "02", title: "Reports upload instantly", desc: "Drag in lab results and medical documents — securely stored on your record." },
  { id: "03", title: "Health status at a glance", desc: "Vitals and indicators summarized, so you always know where you stand." },
  { id: "04", title: "Send everything to your doctor", desc: "One button shares your full history with your specialist before the visit." },
  { id: "05", title: "Visit online", desc: "Continue face-to-face with a secure in-portal video consultation." },
];

function PortalShowcase() {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);

  // auto loop: 01 → 02 → 03 → 04 → 05 → 01 … forever
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setStage((s) => (s + 1) % showcaseSteps.length), 4600);
    return () => clearInterval(id);
  }, [paused]);

  const current = showcaseSteps[stage];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        {/* heading */}
        <div className="mb-10 flex items-end justify-center gap-4">
          <h2 className="font-heading text-center text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            Your care, in one portal
          </h2>
          <span className="mb-1 hidden rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--muted)] sm:block">
            {current.id} / 0{showcaseSteps.length}
          </span>
        </div>

        <div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary-tint)]/25 via-[var(--primary-tint)]/15 to-white p-6 sm:p-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="grid items-center gap-10 lg:grid-cols-[260px_1fr]">
            {/* left: story steps */}
            <div>
              <ul className="space-y-3">
                {showcaseSteps.map((s, i) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setStage(i)}
                      className={`group flex w-full items-center gap-3 text-left transition-all duration-500 ${
                        i === stage ? "translate-x-1" : "opacity-50 hover:opacity-80"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-500 ${
                          i === stage
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                            : "border-[var(--muted)]/40 text-[var(--muted)]"
                        }`}
                      >
                        {s.id}
                      </span>
                      <span
                        className={`font-heading text-xs sm:text-sm ${
                          i === stage ? "font-semibold text-[var(--primary)]" : "text-[var(--muted)]"
                        }`}
                      >
                        {s.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p key={stage} className="anim-show mt-8 hidden max-w-[240px] text-xs leading-relaxed text-[var(--muted)] lg:block">
                {current.desc}
              </p>
            </div>

            {/* right: the mock portal */}
            <div className="relative">
              {/* browser chrome */}
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl shadow-[var(--primary)]/15">
                <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--app-bg)] px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  <span className="mx-auto rounded-full bg-white px-4 py-0.5 text-[10px] text-[var(--muted)]">
                    portal.drbloom.health
                  </span>
                </div>

                <div className="relative h-[340px] p-5 sm:h-[360px]">
                  {/* STAGE 0 — dashboard comes alive */}
                  {stage === 0 && (
                    <div key="s0" className="anim-show h-full">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { l: "Appointments", v: "3" },
                          { l: "Next visit", v: "10:30" },
                          { l: "Reports", v: "8" },
                        ].map((c, i) => (
                          <div key={c.l} className="anim-show rounded-xl bg-[var(--primary-tint)]/20 p-3" style={{ animationDelay: `${i * 150}ms` }}>
                            <div className="font-heading text-xl font-bold text-[var(--ink)]">{c.v}</div>
                            <div className="text-[10px] text-[var(--muted)]">{c.l}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex h-32 items-end gap-2 rounded-xl border border-[var(--border)] p-4">
                        {[40, 65, 30, 80, 55, 95, 70, 50].map((h, i) => (
                          <div key={i} className="anim-col flex-1 rounded-t-md bg-[var(--primary-tint)]" style={{ height: `${h}%`, animationDelay: `${300 + i * 90}ms` }} />
                        ))}
                      </div>
                      <div className="mt-4 space-y-2">
                        {["Lab result ready — Blood panel", "Prescription sent to pharmacy", "Reminder: visit Dr. Sarah tomorrow"].map((t, i) => (
                          <div key={t} className="anim-show flex items-center gap-2 text-xs text-[var(--muted)]" style={{ animationDelay: `${900 + i * 200}ms` }}>
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" /> {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STAGE 1 — report uploads */}
                  {stage === 1 && (
                    <div key="s1" className="anim-show flex h-full flex-col items-center justify-center">
                      <div className="w-full max-w-sm rounded-2xl border-2 border-dashed border-[var(--primary-tint)] bg-[var(--primary-tint)]/10 p-6 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0 4 4m-4-4-4 4"/><path d="M4 20h16"/></svg>
                        </div>
                        <p className="mt-3 text-sm font-medium text-[var(--ink)]">blood-test-report.pdf</p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                          <div className="anim-bar h-full rounded-full bg-[var(--primary)]" />
                        </div>
                        <p className="mt-2 text-[11px] text-[var(--muted)]">Uploading… 100%</p>
                      </div>
                      <div className="anim-show mt-4 flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700" style={{ animationDelay: "1.5s" }}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>
                        Stored securely on your record
                      </div>
                    </div>
                  )}

                  {/* STAGE 2 — health status */}
                  {stage === 2 && (
                    <div key="s2" className="anim-show h-full">
                      <div className="flex items-center justify-between">
                        <h3 className="font-heading font-semibold text-[var(--ink)]">Health status</h3>
                        <span className="anim-show rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold text-emerald-700" style={{ animationDelay: "1.4s" }}>
                          All stable
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {[
                          { l: "Heart rate", v: "72", u: "bpm", w: 70 },
                          { l: "Blood pressure", v: "120/80", u: "mmHg", w: 60 },
                          { l: "Blood sugar", v: "95", u: "mg/dL", w: 45 },
                        ].map((v, i) => (
                          <div key={v.l} className="anim-show rounded-xl border border-[var(--border)] p-3" style={{ animationDelay: `${i * 180}ms` }}>
                            <div className="font-heading text-lg font-bold tabular-nums text-[var(--ink)]">{v.v} <span className="text-[10px] font-normal text-[var(--muted)]">{v.u}</span></div>
                            <div className="mt-1 text-[10px] text-[var(--muted)]">{v.l}</div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--primary-tint)]/20">
                              <div className="anim-bar h-full rounded-full bg-[var(--primary)]" style={{ width: `${v.w}%`, animationDelay: `${300 + i * 180}ms` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="anim-show mt-4 rounded-xl bg-[var(--primary-tint)]/15 p-4 text-xs leading-relaxed text-[var(--muted)]" style={{ animationDelay: "900ms" }}>
                        Last checkup: <b className="text-[var(--ink)]">2 weeks ago</b> — trends look normal. Keep your current medication schedule.
                      </div>
                    </div>
                  )}

                  {/* STAGE 3 — send to doctor */}
                  {stage === 3 && (
                    <div key="s3" className="anim-show flex h-full flex-col items-center justify-center">
                      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] font-heading text-sm font-bold text-white">S</div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--ink)]">Dr. Sarah Khan — Cardiology</div>
                            <div className="text-[11px] text-[var(--muted)]">Tomorrow, 10:30 · Video visit</div>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {["8 reports", "3 prescriptions", "Full history"].map((c, i) => (
                            <span key={c} className="anim-show rounded-full bg-[var(--primary-tint)]/20 px-3 py-1 text-[10px] text-[var(--muted)]" style={{ animationDelay: `${300 + i * 150}ms` }}>{c}</span>
                          ))}
                        </div>
                        <button className="anim-pulse mt-5 w-full rounded-full bg-[var(--primary)] py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                          Send to doctor
                        </button>
                      </div>
                      <div className="anim-show mt-4 flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700" style={{ animationDelay: "1.8s" }}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>
                        Records shared — Dr. Sarah can see everything
                      </div>
                    </div>
                  )}

                  {/* STAGE 4 — online video visit */}
                  {stage === 4 && (
                    <div key="s4" className="anim-show h-full">
                      <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--muted)] p-5 text-white">
                        <div className="flex items-center justify-between">
                          <span className="anim-blink flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Live
                          </span>
                          <span className="text-[10px] text-white/70">10:32</span>
                        </div>
                        <div className="mt-6 flex flex-col items-center">
                          <div className="anim-show flex h-20 w-20 items-center justify-center rounded-full bg-white/15 font-heading text-2xl font-bold ring-4 ring-white/25" style={{ animationDelay: "200ms" }}>
                            SK
                          </div>
                          <p className="anim-show mt-3 text-sm font-medium" style={{ animationDelay: "500ms" }}>Dr. Sarah Khan</p>
                          <p className="anim-show mt-1 text-[11px] text-white/70" style={{ animationDelay: "700ms" }}>Cardiology · Online consultation</p>
                        </div>
                        <div className="absolute bottom-5 left-5 right-5 space-y-2">
                          {[
                            { me: false, t: "Your reports look great — blood pressure is down." },
                            { me: true, t: "Glad to hear that! Same time next month?" },
                            { me: false, t: "Yes — prescription is already in your portal." },
                          ].map((m, i) => (
                            <div key={i} className="anim-show flex" style={{ animationDelay: `${1 + i * 0.7}s` }}>
                              <span className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[11px] ${m.me ? "ml-auto bg-white text-[var(--primary)]" : "bg-white/15 text-white"}`}>
                                {m.t}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* floating accent card */}
              <div className="absolute -bottom-5 -right-3 hidden rounded-2xl bg-[var(--primary)] px-5 py-4 text-white shadow-xl shadow-[var(--primary)]/30 sm:block">
                <div className="font-heading text-sm font-semibold text-[var(--primary-tint)]">{current.id}</div>
                <div className="font-heading text-lg font-bold leading-tight">{current.title}</div>
              </div>
            </div>
          </div>

          {/* mobile description */}
          <p key={`m-${stage}`} className="anim-show mt-6 text-center text-xs leading-relaxed text-[var(--muted)] lg:hidden">
            {current.desc}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- what makes us special — auto slider like the image ---------- */
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
  const next = specials[(index + 1) % specials.length];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        {/* heading — like "Production" */}
        <div className="mb-10 flex items-end justify-center gap-4">
          <h2 className="font-heading text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
            What makes us special
          </h2>
          <span className="mb-1 hidden rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--muted)] sm:block">
            {current.id} / 0{specials.length}
          </span>
        </div>

        {/* panel — like the image */}
        <div
          className="relative h-[580px] overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary-tint)]/25 via-[var(--primary-tint)]/15 to-white sm:h-[540px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* left: index list + description */}
          <div className="absolute left-6 top-10 z-20 sm:left-12">
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
                      className={`font-heading text-xs sm:text-sm ${
                        i === index ? "font-semibold text-[var(--primary)]" : "text-[var(--muted)]"
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-40 hidden max-w-[240px] text-xs leading-relaxed text-[var(--muted)] sm:mt-48 sm:block">
              {current.desc}
            </p>
          </div>

          {/* center: big photo (crossfade + slow zoom) */}
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[62%] max-w-[560px] -translate-x-1/2 -translate-y-1/2 sm:w-[48%]">
            {specials.map((s, i) => (
              <img
                key={s.id}
                src={s.img}
                alt={s.title}
                className={`absolute inset-0 h-full w-full rounded-2xl object-cover shadow-2xl shadow-[var(--primary)]/20 transition-all duration-[1400ms] ease-out ${
                  i === index ? "scale-100 opacity-100" : "scale-110 opacity-0"
                }`}
              />
            ))}
          </div>

          {/* right: faded preview of the next slide */}
          <div className="absolute right-6 top-1/2 hidden h-[300px] w-[220px] -translate-y-1/2 overflow-hidden rounded-2xl opacity-40 sm:block">
            <img
              key={next.id}
              src={next.img}
              alt=""
              className="h-full w-full object-cover transition-all duration-[1400ms]"
            />
            <div className="absolute inset-0 bg-white/40" />
          </div>

          {/* navy info card — bottom right */}
          <div className="absolute bottom-8 right-6 z-20 sm:right-12">
            <div className="w-[240px] rounded-2xl bg-[var(--primary)] p-6 text-white shadow-xl shadow-[var(--primary)]/30">
              <div className="font-heading text-sm font-semibold text-[var(--primary-tint)]">
                {current.id}
              </div>
              <div className="font-heading mt-2 text-2xl font-bold leading-tight">
                {current.title}
              </div>
              <Link
                href="/services"
                className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary-tint)] transition-all hover:gap-3"
              >
                More info
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* mobile description */}
          <p className="absolute bottom-8 left-6 right-6 text-xs leading-relaxed text-[var(--muted)] sm:hidden">
            {current.desc}
          </p>
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

        {/* 3 stat cards — with mouse-follow glow */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {/* card 1 — big number + icon */}
          <div
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
            className="glow-card flex min-h-[240px] flex-col overflow-hidden rounded-3xl bg-[var(--primary-tint)]/25 p-8 transition-all duration-700 ease-out"
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
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
            className="glow-card flex min-h-[240px] flex-col overflow-hidden rounded-3xl bg-[var(--primary-tint)]/25 p-8 transition-all duration-700 ease-out"
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
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
            className="glow-card flex min-h-[240px] flex-col overflow-hidden rounded-3xl bg-[var(--primary-tint)]/25 p-8 transition-all duration-700 ease-out"
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

        {/* buttons — dark, like the image */}
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
      {/* Hero — clean design background + entrance animation */}
      <section className="relative min-h-screen overflow-hidden">
        <Image
          src="/hero4.webp"
          alt=""
          fill
          className="absolute inset-0 h-full w-full select-none object-cover"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16 sm:px-12 sm:pt-24 lg:pt-32">
          <h1
            className="hero-anim font-heading max-w-2xl text-5xl font-bold leading-[1.05] tracking-tight text-[var(--primary)] sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "0.15s" }}
          >
            Advanced healthcare.
          </h1>

          <p
            className="hero-anim mt-8 max-w-lg text-sm leading-relaxed text-[var(--muted)]"
            style={{ animationDelay: "0.35s" }}
          >
            At Dr&apos;Bloom, we combine advanced medical technology, experienced specialists,
            and patient-centered care to deliver better healthcare outcomes at every
            stage of life.
          </p>

          <div
            className="hero-anim mt-9 flex flex-wrap items-center gap-5"
            style={{ animationDelay: "0.55s" }}
          >
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

      {/* Our departments — 3 cards from the database */}
      <DepartmentsSection />

      {/* Our specialist doctors — 4 cards from the database */}
      <DoctorsSection />

      {/* About — our story + our work chart */}
      <AboutSection />

      {/* Your care, in one portal — auto-looping animated story */}
      <PortalShowcase />

      {/* What makes us special — auto slider */}
      <SpecialSlider />

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