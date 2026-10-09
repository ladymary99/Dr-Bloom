"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Doctor = { name: string; specialization: string | null; department: string | null };

/* featured doctors for the hero slider — API data is used when available */
const fallbackDoctors: Doctor[] = [
  { name: "Dr. Sarah Khan", specialization: "Cardiologist", department: "Cardiology" },
  { name: "Dr. Omar Rahimi", specialization: "Neurologist", department: "Neurology" },
  { name: "Dr. Maya Anderson", specialization: "Pediatrician", department: "Pediatrics" },
  { name: "Dr. Daniel Wilson", specialization: "Orthopedic Surgeon", department: "Orthopedics" },
];

const doctorPhotos = ["/doc1.webp", "/doc2.webp", "/doc3.webp", "/doc4.webp"];

/* ---------- hero slider — like the image ---------- */
function DoctorsHero({ doctors }: { doctors: Doctor[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || doctors.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % doctors.length), 5200);
    return () => clearInterval(id);
  }, [paused, doctors.length]);

  const current = doctors[index];

  return (
    <section className="px-4 pt-10">
      <div
        className="relative mx-auto h-[600px] max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary-tint)]/25 via-[var(--primary-tint)]/15 to-white sm:h-[560px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* left: slide numbers + doctor info */}
        <div className="absolute left-6 top-10 z-20 sm:left-12">
          {/* numbers like the image */}
          <div className="flex gap-5">
            {doctors.map((d, i) => (
              <button
                key={d.name}
                onClick={() => setIndex(i)}
                className={`font-heading text-sm transition-all duration-500 ${
                  i === index
                    ? "scale-110 font-bold text-[var(--primary)]"
                    : "text-[var(--muted)]/50 hover:text-[var(--muted)]"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* doctor text — animates per slide */}
          <div key={index} className="anim-show mt-12 max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
              {current.specialization ?? "Specialist"}
            </p>
            <h1 className="font-heading mt-3 text-4xl font-bold leading-tight tracking-tight text-[var(--ink)] sm:text-5xl">
              {current.name}
            </h1>

            {/* sections the doctor works in */}
            <div className="mt-6 flex flex-wrap gap-2">
              {["Outpatient clinic", current.department ?? "General", "Online visits"].map((s, i) => (
                <span
                  key={s}
                  className="anim-show rounded-full bg-[var(--primary-tint)]/25 px-4 py-1.5 text-xs text-[var(--muted)]"
                  style={{ animationDelay: `${250 + i * 150}ms` }}
                >
                  {s}
                </span>
              ))}
            </div>

            <p className="anim-show mt-6 max-w-xs text-sm leading-relaxed text-[var(--muted)]" style={{ animationDelay: "700ms" }}>
              Certified specialist with years of experience — available for in-person
              consultations and online video visits.
            </p>

            
          </div>
        </div>

        {/* right: big portrait with glass card — like the image */}
        <div className="absolute right-0 top-0 h-full w-[55%] sm:w-[46%]">
          {doctors.map((d, i) => (
            <img
              key={d.name}
              src={doctorPhotos[i % doctorPhotos.length]}
              alt={d.name}
              className={`absolute inset-0 h-full w-full object-cover object-top transition-all duration-[1400ms] ease-out ${
                i === index ? "scale-100 opacity-100" : "scale-110 opacity-0"
              }`}
              style={{ borderRadius: "0 24px 24px 0" }}
            />
          ))}
          {/* soft edge blend */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-transparent" />

          {/* glass overlay card */}
          <div key={`card-${index}`} className="anim-show absolute bottom-10 left-6 right-6 sm:left-10 sm:right-14">
            <div className="rounded-2xl border border-white/40 bg-white/20 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[var(--primary)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/>
                    </svg>
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[var(--ink)]">{current.name}</div>
                    <div className="text-xs text-[var(--muted)]">{current.specialization ?? "Specialist"}</div>
                  </div>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-emerald-600">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 13 4 4L19 7"/>
                  </svg>
                </span>
              </div>
              <Link
                href="/register"
                className="mt-4 flex w-full items-center justify-between rounded-xl bg-[var(--primary)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[var(--primary)]/85"
              >
                Book appointment <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);

  useEffect(() => {
    api.get("/public/doctors").then((r) => setDoctors(r.data)).catch(() => setDoctors([]));
  }, []);

  const list = (doctors && doctors.length ? doctors : fallbackDoctors).slice(0, 4);

  return (
    <div>
      {/* Hero slider — like the image */}
      <DoctorsHero doctors={list} />

      {/* All doctors grid */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            All our specialists
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted)]">
            Certified specialists across every department — book any of them online.
          </p>
        </div>

        {!doctors ? (
          <div className="py-16 text-center text-[var(--muted)]">Loading…</div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center text-[var(--muted)]">No doctors listed yet.</div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <div
                key={d.name}
                className="rounded-3xl border border-[var(--border)] bg-white p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary-tint)] hover:shadow-lg hover:shadow-[var(--primary-tint)]/30"
              >
                <div className="font-heading mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-xl font-semibold text-white">
                  {d.name.replace("Dr. ", "").charAt(0)}
                </div>
                <h3 className="mt-4 font-semibold text-[var(--ink)]">{d.name}</h3>
                <p className="text-sm text-[var(--primary)]">{d.specialization ?? "Specialist"}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{d.department ?? ""}</p>
                <Link
                  href="/register"
                  className="btn-roll mt-5 inline-block rounded-full bg-[var(--primary)] px-5 py-2 text-xs font-semibold uppercase text-white transition hover:bg-[var(--primary)]/85"
                >
                  <span className="roll">
                    <span className="r1">Book appointment</span>
                    <span className="r2" aria-hidden="true">Book appointment</span>
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}