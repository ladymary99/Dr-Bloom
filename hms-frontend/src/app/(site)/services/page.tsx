"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Dept = { id: number; name: string; code: string; description: string | null };

/* shown if the API hasn't returned (or returned fewer) — keeps 6 cards */
const fallbackDepts: Dept[] = [
  { id: 1, name: "Cardiology",          code: "CAR", description: "Heart and cardiovascular care." },
  { id: 2, name: "Neurology",           code: "NEU", description: "Diagnosis and treatment of neurological conditions." },
  { id: 3, name: "Pediatrics",          code: "PED", description: "Specialized healthcare for children and adolescents." },
  { id: 4, name: "Orthopedics",         code: "ORT", description: "Bone, joint, muscle, and movement care." },
  { id: 5, name: "Emergency Medicine",  code: "EMR", description: "24/7 urgent and emergency medical care." },
  { id: 6, name: "Radiology & Imaging", code: "RAD", description: "Advanced diagnostic imaging and medical scans." },
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
    api.get("/departments").then((r) => setDepts(r.data)).catch(() => {});
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
              Kabul
              <span className="absolute -bottom-1 left-0 right-0 border-b-2 border-white/70" />
              <svg viewBox="0 0 24 24" className="absolute -right-6 top-1/2 h-5 w-5 -translate-y-1/2 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
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
              className="glow-card min-h-[300px] overflow-hidden rounded-3xl bg-white p-8 shadow-xl shadow-[var(--primary)]/10 transition-all duration-700 ease-out"
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
                {d.description ?? "Consultations, diagnostics and treatment."}
              </p>
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
  );
}