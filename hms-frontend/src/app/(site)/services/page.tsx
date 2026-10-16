"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Dept = { id: number; name: string; code: string; description: string | null };

/* shown if the API hasn't returned (or returned fewer) — keeps 6 cards */
const fallbackDepts: Dept[] = [
  { id: 1, name: "Cardiology",          code: "CAR", description: "Comprehensive heart and cardiovascular care — from routine ECGs and stress tests to long-term management of blood pressure, cholesterol and heart disease." },
  { id: 2, name: "Neurology",           code: "NEU", description: "Expert diagnosis and treatment of neurological conditions, including migraines, epilepsy, stroke recovery and disorders of the brain, spine and nervous system." },
  { id: 3, name: "Pediatrics",          code: "PED", description: "Specialized healthcare for children and adolescents — newborn checks, vaccinations, growth tracking and treatment of childhood illnesses in a child-friendly setting." },
  { id: 4, name: "Orthopedics",         code: "ORT", description: "Bone, joint, muscle and movement care — fracture treatment, arthritis management, sports injuries and post-surgery rehabilitation with modern physiotherapy." },
  { id: 5, name: "Emergency Medicine",  code: "EMR", description: "24/7 urgent and emergency medical care with rapid triage, resuscitation, trauma response and a coordinated team ready around the clock, every day of the year." },
  { id: 6, name: "Radiology & Imaging", code: "RAD", description: "Advanced diagnostic imaging and medical scans — X-ray, ultrasound and CT, read by specialist radiologists with results delivered to your portal the same day." },
];

/* real SVG icons per department (like the image) */
const iconProps = {
  className: "h-7 w-7",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const deptIcons: [string, React.ReactNode][] = [
  ["cardio", <svg key="cardio" {...iconProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/><path d="M7 12h3l1.5-3 2 5L15 12h2"/></svg>],
  ["neuro", <svg key="neuro" {...iconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>],
  ["ped", <svg key="ped" {...iconProps}><circle cx="12" cy="8" r="4"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/></svg>],
  ["ortho", <svg key="ortho" {...iconProps}><path d="M17 10c.7-.7 1.7-1 2.5-.5a2.5 2.5 0 1 0-3-3c-.5-.8-.2-1.8.5-2.5a2.5 2.5 0 1 0-3 3L7 14c-.7.7-1.7 1-2.5.5a2.5 2.5 0 1 0 3 3c.5.8.2 1.8-.5 2.5a2.5 2.5 0 1 0 3-3z"/></svg>],
  ["emer", <svg key="emer" {...iconProps}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>],
  ["radio", <svg key="radio" {...iconProps}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></svg>],
  ["lab", <svg key="lab" {...iconProps}><path d="M10 2v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8.5V2M8.5 2h7M7 16h10"/></svg>],
  ["onco", <svg key="onco" {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>],
  ["women", <svg key="women" {...iconProps}><circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 18h6"/></svg>],
  ["surg", <svg key="surg" {...iconProps}><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="m8.8 12 2.2 2.2 4.2-4.7"/></svg>],
];

function iconFor(name: string) {
  const n = name.toLowerCase();
  for (const [key, icon] of deptIcons) {
    if (n.includes(key)) return icon;
  }
  return deptIcons[0][1]; // heart fallback
}

export default function ServicesPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    api.get("/departments").then((r) => setDepts(Array.isArray(r.data) ? r.data : [])).catch(() => {});
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

  const list = (depts.length ? depts : fallbackDepts).slice(0, 6);

  return (
    <>
      <section
        ref={ref}
        className="bg-gradient-to-b from-[var(--primary)] via-[var(--muted)] via-55% to-white px-4 pb-24 pt-20"
      >
        <div className="mx-auto max-w-6xl">
          {/* heading with underlined word + caret */}
          <div
            className="text-center transition-all duration-700 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
          >
            <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Find the right care in{" "}
              <span className="relative inline-block">
                Canada
                
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm text-white/80">
              Full-service care across {depts.length || 6} departments — book any of them online.
            </p>
          </div>

          {/* 6 white cards — icon top-left, glow + stagger like homepage */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d, i) => (
              <div
                key={d.id}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
                className="glow-card flex min-h-[340px] flex-col overflow-hidden rounded-3xl bg-white p-8 shadow-xl shadow-[var(--primary)]/10 transition-all duration-700 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "none" : "translateY(40px)",
                  transitionDelay: `${200 + i * 120}ms`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="text-[var(--primary)]">
                    {iconFor(d.name)}
                  </div>
                  <span className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-1 font-mono text-[11px] text-[var(--muted)]">
                    {d.code}
                  </span>
                </div>
                <h3 className="font-heading mt-8 text-xl font-semibold leading-snug text-[var(--ink)]">
                  {d.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                  {d.description ?? "Consultations, diagnostics and treatment from our specialist team."}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-6">
                  {["Consultations", "Diagnostics", "Follow-up care"].map((c) => (
                    <span key={c} className="rounded-full bg-[var(--primary-tint)]/20 px-3 py-1 text-[10px] text-[var(--muted)]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* dark pill button */}
          <div
            className="mt-14 text-center transition-all duration-700 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transitionDelay: "900ms" }}
          >
            <Link
              href="/register"
              className="btn-roll inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3.5 text-xs  uppercase  text-white  "
            >
              <span className="roll">
                <span className="r1">Book appointment</span>
                <span className="r2" aria-hidden="true">Book appointment</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Your care, in one portal — same showcase as homepage */}
      <PortalShowcase />
    </>
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