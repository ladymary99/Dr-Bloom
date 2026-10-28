"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

/* Fields marked "?" are optional — if your backend returns them, the card uses them.
   Any doctor your backend returns from /public/doctors appears here automatically. */
type Doctor = {
  id?: number;
  name: string;
  specialization: string | null;
  department: string | null;
  photo?: string | null;
  photo_url?: string | null;
  image?: string | null;
  bio?: string | null;
  experience_years?: number | null;
};

/* featured doctors for the hero slider — API data is used when available */
const fallbackDoctors: Doctor[] = [
  { name: "Dr. Sarah Khan", specialization: "Cardiologist", department: "Cardiology" },
  { name: "Dr. Omar Rahimi", specialization: "Neurologist", department: "Neurology" },
  { name: "Dr. Maya Anderson", specialization: "Pediatrician", department: "Pediatrics" },
  { name: "Dr. Daniel Wilson", specialization: "Orthopedic Surgeon", department: "Orthopedics" },
];

const doctorPhotos = ["/doc1.webp", "/doc2.webp", "/doc3.webp", "/doc4.webp"];

const norm = (s: string) => s.toLowerCase().trim();
const deptName = (d: Doctor) => d.department?.trim() || "General";

/* demo portraits only for the demo doctors (matched by name) —
   every other doctor uses their own photo from the backend, or a designed initials portrait */
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

/* ---------- one doctor card: portrait + glass panel (image 2) with a quote-style bio (image 1) ---------- */
function DoctorCard({ d, index }: { d: Doctor; index: number }) {
  const photo = photoFor(d);
  const dept = deptName(d);
  const spec = d.specialization ?? "Specialist";
  const bio =
    d.bio?.trim() ||
    `Certified ${spec.toLowerCase()} in our ${dept} department — available for in-person consultations and online video visits.`;
  const chips = [
    "Outpatient clinic",
    "Online visits",
    ...(d.experience_years ? [`${d.experience_years}+ yrs experience`] : []),
  ];
  const q = `doctor=${encodeURIComponent(d.name)}&department=${encodeURIComponent(dept)}`;

  return (
    <article
      className="group anim-show flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary-tint)] hover:shadow-xl hover:shadow-[var(--primary-tint)]/30"
      style={{ animationDelay: `${(index % 3) * 120}ms` }}
    >
      {/* portrait */}
      <div className="relative h-80 overflow-hidden bg-gradient-to-br from-[var(--primary-tint)]/50 via-[var(--primary-tint)]/25 to-white">
        {photo ? (
          <img
            src={photo}
            alt={d.name}
            className="h-full w-full object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-105"
          />
        ) : (
          /* designed initials portrait for doctors without a photo yet */
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--muted)]">
            <span className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
            <span className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-white/10" />
            <span className="font-heading relative text-7xl font-bold tracking-tight text-white/85">
              {initialsOf(d.name)}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        {/* department badge */}
        <span className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/60 px-3 py-1 text-[11px] font-medium text-[var(--ink)] backdrop-blur-md">
          {dept}
        </span>

        {/* glass panel — name, specialty, verified */}
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

      {/* quote-style bio + actions */}
      <div className="flex flex-1 flex-col p-6">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--primary-tint)]" fill="currentColor" aria-hidden="true">
          <path d="M9.5 6C6.5 7 4 9.8 4 13.5V18h6v-6H7c0-2 1-3.4 3-4.2L9.5 6zm10 0c-3 1-5.5 3.8-5.5 7.5V18h6v-6h-3c0-2 1-3.4 3-4.2L19.5 6z"/>
        </svg>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{bio}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-[var(--primary-tint)]/20 px-3 py-1 text-[10px] text-[var(--muted)]">
              {c}
            </span>
          ))}
        </div>

        <Link
          href={`/register?${q}`}
          className="btn-roll mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-xs  uppercase  text-white  "
        >
          <span className="roll">
            <span className="r1">Book appointment</span>
            <span className="r2" aria-hidden="true">Book appointment</span>
          </span>
        </Link>
      </div>
    </article>
  );
}

const PAGE_SIZE = 9;

export default function DoctorsPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-[var(--muted)]">Loading doctors…</div>}>
      <DoctorsContent />
    </Suspense>
  );
}

function DoctorsContent() {
  const searchParams = useSearchParams();
  const initialDepartment = searchParams.get("department")?.trim() ?? "";
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [doctorsError, setDoctorsError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [dept, setDept] = useState(initialDepartment || "all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const listRef = useRef<HTMLElement>(null);
  const fromLink = useRef(Boolean(initialDepartment));

  useEffect(() => {
    api.get<Doctor[]>("/public/doctors")
      .then((r) => setDoctors(r.data))
      .catch(() => {
        setDoctors([]);
        setDoctorsError("Could not load doctors. Please check that the /public/doctors endpoint is available.");
      });
  }, [reloadCount]);

  useEffect(() => {
    if (doctors && fromLink.current) {
      fromLink.current = false;
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [doctors]);

  const list = (doctors && doctors.length ? doctors : fallbackDoctors).slice(0, 4);

  const all = useMemo(() => doctors ?? [], [doctors]);

  const deptCounts = useMemo(() => {
    const m: Record<string, number> = {};
    all.forEach((d) => {
      const k = deptName(d);
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [all]);
  const deptList = Object.keys(deptCounts).sort((a, b) => a.localeCompare(b));

  const filtered = useMemo(() => {
    const q = norm(query);
    return all
      .filter((d) => dept === "all" || norm(deptName(d)) === norm(dept))
      .filter((d) => !q || norm(`${d.name} ${d.specialization ?? ""} ${deptName(d)}`).includes(q))
      .sort((a, b) => deptName(a).localeCompare(deptName(b)) || a.name.localeCompare(b.name));
  }, [all, dept, query]);

  const chip = (active: boolean) =>
    `flex-none rounded-full px-4 py-2 text-xs font-medium transition-all duration-300 ${
      active
        ? "bg-[var(--primary)] text-white"
        : "bg-[var(--primary-tint)]/20 text-[var(--muted)] hover:bg-[var(--primary-tint)]/35"
    }`;

  return (
    <div>
      {/* Hero slider — like the image */}
      <DoctorsHero doctors={list} />

      {/* All doctors */}
      <section ref={listRef} className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            All our specialists
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted)]">
            {doctors && doctors.length
              ? `${doctors.length} certified specialists across ${deptList.length} departments — book any of them online.`
              : "Certified specialists across every department — book any of them online."}
          </p>
        </div>

        {doctorsError ? (
          <div role="alert" className="py-16 text-center text-sm text-[var(--muted)]">
            <p>{doctorsError}</p>
            <button
          onClick={() => {
            setDoctorsError("");
            setDoctors(null);
            setReloadCount((count) => count + 1);
          }}
              className="mt-3 font-semibold text-[var(--primary)] underline"
            >
              Try again
            </button>
          </div>
        ) : !doctors ? (
          <div className="py-16 text-center text-[var(--muted)]">Loading…</div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center text-[var(--muted)]">No doctors listed yet.</div>
        ) : (
          <>
            {/* search + department filter */}
            <div className="mt-10 flex flex-col gap-5">
              <div className="relative mx-auto w-full max-w-md">
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShown(PAGE_SIZE); }}
                  placeholder="Search by name or specialty"
                  aria-label="Search doctors"
                  className="w-full rounded-full border border-[var(--border)] bg-white py-3 pl-11 pr-5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--primary-tint)]"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
                <button onClick={() => { setDept("all"); setShown(PAGE_SIZE); }} className={chip(dept === "all")}>
                  All ({doctors.length})
                </button>
                {deptList.map((n) => (
                  <button key={n} onClick={() => { setDept(n); setShown(PAGE_SIZE); }} className={chip(norm(dept) === norm(n))}>
                    {n} ({deptCounts[n]})
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--muted)]">
                No doctors match your search.{" "}
                <button
                  onClick={() => { setDept("all"); setQuery(""); setShown(PAGE_SIZE); }}
                  className="font-semibold text-[var(--primary)] underline"
                >
                  Show all doctors
                </button>
              </div>
            ) : (
              <>
                <div key={`${dept}-${query}`} className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.slice(0, shown).map((d, i) => (
                    <DoctorCard key={d.id ?? d.name} d={d} index={i} />
                  ))}
                </div>

                {filtered.length > shown && (
                  <div className="mt-12 text-center">
                    <button
                      onClick={() => setShown((s) => s + PAGE_SIZE)}
                      className="btn-roll inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3.5 text-xs  uppercase  text-white  "
                    >
                      <span className="roll">
                        <span className="r1">Show more doctors</span>
                        <span className="r2" aria-hidden="true">Show more doctors</span>
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}