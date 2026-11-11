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

const doctorPhotos = ["/dc1.png", "/dc5.webp", "/dc3.webp", "/dc4.png"];

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

const bookHref = (d: Doctor) =>
  `/register?doctor=${encodeURIComponent(d.name)}&department=${encodeURIComponent(deptName(d))}`;

const bioFor = (d: Doctor) =>
  d.bio?.trim() ||
  `Certified ${(d.specialization ?? "specialist").toLowerCase()} in our ${deptName(d)} department — available for in-person consultations and online video visits.`;

/* portrait image with an initials fallback if the photo is missing or fails to load */
function Portrait({ d, className, eager }: { d: Doctor; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = failed ? null : photoFor(d);

  return photo ? (
    <img
      src={photo}
      alt={d.name}
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className={className}
    />
  ) : (
    <div className="absolute inset-0 flex items-start justify-center overflow-hidden bg-gradient-to-br from-[var(--primary-tint)]/50 to-[var(--primary-tint)]/15 pt-20">
      <span className="font-heading text-8xl font-bold tracking-tight text-[var(--primary)]/70">
        {initialsOf(d.name)}
      </span>
    </div>
  );
}

/* ---------- hero banner — blue block on the left, portrait takes 62% on the right (tablet + desktop);
   on mobile the blue block is full width with the portrait underneath ---------- */
function DoctorsHero({ doctors }: { doctors: Doctor[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || doctors.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % doctors.length), 5200);
    return () => clearInterval(id);
  }, [paused, doctors.length]);

  const current = doctors[index];
  const chips = [
    "Outpatient clinic",
    deptName(current),
    "Online visits",
    ...(current.experience_years ? [`${current.experience_years}+ yrs experience`] : []),
  ];

  return (
    <section className="px-4 pt-[46px] sm:px-6">
      <div
        className="relative mx-auto flex max-w-6xl flex-col overflow-hidden rounded-3xl bg-[var(--primary-tint)]/20 md:block md:h-[560px] lg:h-[600px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* blue block: full width on mobile, 45% on tablet/desktop (top-left corner square) */}
        <div className="relative z-10 order-1 w-full rounded-[0_28px_28px_28px] bg-[var(--primary-tint)] px-6 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-10 md:absolute md:left-0 md:top-0 md:h-full md:w-[calc(45%-14px)] md:rounded-[0_36px_36px_36px] md:px-8 md:pb-8 md:pt-10 lg:px-12 lg:pb-10 lg:pt-12">
          {/* slide numbers */}
          <div className="flex gap-5">
            {doctors.map((d, i) => (
              <button
                key={d.id ?? d.name}
                onClick={() => setIndex(i)}
                aria-label={`Show ${d.name}`}
                className={`font-heading text-sm transition-all duration-500 ${
                  i === index
                    ? "scale-110 font-bold text-[var(--primary)]"
                    : "text-[var(--muted)]/60 hover:text-[var(--muted)]"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </button>
            ))}
          </div>

          {/* doctor info — animates per slide */}
          <div key={index} className="anim-show mt-8 md:mt-8 lg:mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)]">
              {current.specialization ?? "Specialist"}
            </p>
            <h1 className="font-heading mt-3 text-4xl font-bold leading-[1.05] tracking-tight text-[var(--primary)] sm:text-5xl md:text-3xl lg:text-[2.75rem] xl:text-5xl">
              {current.name}
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              {chips.map((s, i) => (
                <span
                  key={s}
                  className="anim-show rounded-full bg-white/60 px-4 py-1.5 text-xs text-[var(--muted)]"
                  style={{ animationDelay: `${250 + i * 120}ms` }}
                >
                  {s}
                </span>
              ))}
            </div>

            <p
              className="anim-show mt-5 line-clamp-4 max-w-md text-sm leading-relaxed text-[var(--muted)] md:line-clamp-3 lg:line-clamp-4"
              style={{ animationDelay: "700ms" }}
            >
              {bioFor(current)}
            </p>

            <div className="anim-show mt-7" style={{ animationDelay: "850ms" }}>
              <Link
                href={bookHref(current)}
                className="bg-[var(--primary)] text-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
              >
                <span className="roll">
                  <span className="r1">Book appointment</span>
                  <span className="r2" aria-hidden="true">Book appointment</span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* portrait: under the block on mobile, right side (62%) on tablet/desktop */}
        <div className="relative order-2 h-[340px] sm:h-[420px] md:absolute md:right-0 md:top-0 md:h-full md:w-[62%]">
          {doctors.map((d, i) => (
            <div
              key={d.id ?? d.name}
              aria-hidden={i !== index}
              className={`absolute inset-0 transition-all duration-[1400ms] ease-out ${
                i === index ? "scale-100 opacity-100" : "scale-110 opacity-0"
              }`}
            >
              <Portrait d={d} eager={i === 0} className="h-full w-full object-cover object-top" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- one doctor card — home-page style (portrait + blue name block) with a little more info ---------- */
function DoctorCard({ d, index }: { d: Doctor; index: number }) {
  const dept = deptName(d);
  const spec = d.specialization ?? "Specialist";
  const chips = [
    "Outpatient clinic",
    "Online visits",
    ...(d.experience_years ? [`${d.experience_years}+ yrs experience`] : []),
  ];

  return (
    <article
      className="group anim-show flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-white transition-all duration-500 hover:-translate-y-1 hover:border-[var(--primary-tint)] hover:shadow-xl hover:shadow-[var(--primary-tint)]/30"
      style={{ animationDelay: `${(index % 3) * 120}ms` }}
    >
      {/* portrait + blue block (same as the home page doctors) */}
      <div className="relative h-[320px] overflow-hidden bg-gradient-to-b from-white to-[var(--primary-tint)]/20">
        <Portrait
          d={d}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
        <div className="absolute bottom-0 left-0 w-[86%] rounded-[20px_20px_20px_0] bg-[var(--primary-tint)] px-5 pb-4 pt-4">
          <div className="font-heading truncate text-sm font-semibold text-[var(--primary)]">{d.name}</div>
          <div className="mt-1 truncate text-[11px] text-[var(--muted)]">{spec}</div>
        </div>
      </div>

      {/* a little more information */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--primary-tint)]/30 px-3 py-1 text-[11px] font-medium text-[var(--primary)]">
            {dept}
          </span>
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-[var(--primary-tint)]/20 px-3 py-1 text-[10px] text-[var(--muted)]">
              {c}
            </span>
          ))}
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">{bioFor(d)}</p>

        <Link
          href={bookHref(d)}
          className="bg-[var(--primary-tint)] btn-hero btn-roll mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs uppercase"
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
      {/* Hero banner */}
      <DoctorsHero doctors={list} />

      {/* All doctors */}
      <section ref={listRef} className="mx-auto max-w-6xl scroll-mt-6 px-6 py-[46px]">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl lg:text-5xl">
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
                <div key={`${dept}-${query}`} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {filtered.slice(0, shown).map((d, i) => (
                    <DoctorCard key={d.id ?? d.name} d={d} index={i} />
                  ))}
                </div>

                {filtered.length > shown && (
                  <div className="mt-12 text-center">
                    <button
                      onClick={() => setShown((s) => s + PAGE_SIZE)}
                      className="bg-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
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