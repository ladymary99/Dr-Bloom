"use client";

/* One page for every department: /department/cardiology, /department/neurology, ...
   Save as: app/department/[slug]/page.tsx */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { iconFor, norm, photosFor, serviceChips, serviceText, slugify, useDepartments } from "@/lib/departments";

const SECTION = "px-6 py-[46px]";
const H2 = "font-heading text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl lg:text-5xl";

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;

function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  );
}

type Doctor = {
  id?: number;
  name: string;
  specialization: string | null;
  department: string | null;
  photo?: string | null;
  photo_url?: string | null;
  image?: string | null;
};

const initialsOf = (name: string) =>
  name
    .replace(/^dr\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

/* reveal a section when it scrolls into view */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  /* no dependency list on purpose: the section only exists once its department has loaded */
  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  });

  return [ref, visible] as const;
}

const ic = {
  className: "h-6 w-6",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

const iClock = <svg {...ic}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
const iPin = <svg {...ic}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const iAlert = <svg {...ic}><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17h.01" /></svg>;
const iTeam = <svg {...ic}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1M16 4.6a3.5 3.5 0 0 1 0 6.8M18 20v-1a6.5 6.5 0 0 0-3-5.5" /></svg>;

/* ---------- photo carousel with text on top ---------- */
type Slide = { pill: string; title: string; text: string; img: string };

function DeptCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), 5500);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  return (
    <div
      className="relative h-[420px] overflow-hidden rounded-3xl bg-[var(--primary-tint)]/30 sm:h-[460px] lg:h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, n) => {
        const active = n === i;
        return (
          <div
            key={n}
            aria-hidden={!active}
            className="absolute inset-0 transition-opacity duration-[1200ms] ease-out"
            style={{ opacity: active ? 1 : 0 }}
          >
            <img
              src={s.img}
              alt=""
              draggable={false}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${
                active ? "scale-105" : "scale-100"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div
              className="absolute bottom-0 left-0 max-w-2xl p-6 pr-20 text-white sm:p-8 sm:pr-24"
              style={{
                transform: active ? "none" : "translateY(16px)",
                transition: "transform 900ms cubic-bezier(0.16,1,0.3,1)",
                transitionDelay: active ? "250ms" : "0ms",
              }}
            >
              <span className="inline-block rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink)]">
                {s.pill}
              </span>
              <h2 className="font-heading mt-4 text-2xl font-semibold leading-tight sm:text-4xl">{s.title}</h2>
              <p className="mt-3 line-clamp-3 max-w-md text-xs leading-relaxed text-white/85 sm:text-sm">{s.text}</p>
            </div>
          </div>
        );
      })}

      <div className="absolute right-5 top-5 flex gap-1.5 sm:right-6 sm:top-6">
        {slides.map((_, n) => (
          <button
            key={n}
            type="button"
            aria-label={`Show slide ${n + 1}`}
            onClick={() => setI(n)}
            className={`h-1 rounded-full bg-white transition-all duration-500 ${
              n === i ? "w-8 opacity-100" : "w-4 opacity-50 hover:opacity-80"
            }`}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Next slide"
        onClick={() => setI((x) => (x + 1) % slides.length)}
        className="absolute bottom-5 right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--ink)] shadow-lg transition-transform duration-300 hover:scale-105 sm:bottom-6 sm:right-6"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

function DoctorTile({ d }: { d: Doctor }) {
  const [failed, setFailed] = useState(false);
  const photo = failed ? null : d.photo ?? d.photo_url ?? d.image ?? null;

  return (
    <Link
      href={`/doctors?department=${encodeURIComponent(d.department ?? "")}`}
      className="group relative block h-[320px] overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-b from-white to-[var(--primary-tint)]/20 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-[var(--primary-tint)] hover:shadow-xl hover:shadow-[var(--primary-tint)]/30"
    >
      {photo ? (
        <img
          src={photo}
          alt={d.name}
          draggable={false}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-br from-[var(--primary-tint)]/50 to-[var(--primary-tint)]/15 pt-16">
          <span className="font-heading text-7xl font-bold tracking-tight text-[var(--primary)]/70">
            {initialsOf(d.name)}
          </span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 w-[86%] rounded-[20px_20px_20px_0] bg-[var(--primary-tint)] px-5 pb-4 pt-4">
        <div className="font-heading truncate text-sm font-semibold text-[var(--primary)]">{d.name}</div>
        <div className="mt-1 truncate text-[11px] text-[var(--muted)]">{d.specialization ?? "Specialist"}</div>
      </div>
    </Link>
  );
}

export default function DepartmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { list, loaded } = useDepartments();
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const mounted = useHydrated();

  const [glanceRef, glanceVisible] = useReveal(0.2);
  const [servicesRef, servicesVisible] = useReveal(0.1);
  const [stepsRef, stepsVisible] = useReveal(0.15);
  const [urgentRef, urgentVisible] = useReveal(0.2);

  const index = list.findIndex((d) => slugify(d.name) === slug);
  const dept = index >= 0 ? list[index] : undefined;

  useEffect(() => {
    api
      .get("/public/doctors")
      .then((r) => setDoctors(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDoctors([]));
  }, []);

  if (!dept && !loaded) {
    return (
      <section className={SECTION}>
        <div className="mx-auto max-w-6xl">
          <div className="h-[380px] animate-pulse rounded-3xl bg-[var(--primary-tint)]/20" />
        </div>
      </section>
    );
  }

  if (!dept) {
    return (
      <section className={`${SECTION} text-center`}>
        <div className="mx-auto max-w-xl py-16">
          <h1 className={H2}>Department not found</h1>
          <p className="mt-4 text-sm text-[var(--muted)]">
            We couldn&apos;t find that department. Browse the full list instead.
          </p>
          <Link
            href="/department"
            className="bg-[var(--primary-tint)] btn-hero btn-roll mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
          >
            <span className="roll">
              <span className="r1">See all departments</span>
              <span className="r2" aria-hidden="true">See all departments</span>
            </span>
          </Link>
        </div>
      </section>
    );
  }

  const svc = dept.services ?? [];
  const nurses = dept.nurses ?? 0;
  const myDoctors = (doctors ?? []).filter((d) => d.department && norm(d.department) === norm(dept.name));
  const photos = photosFor(dept, index);
  const phone = dept.phone ?? "";
  const phoneHref = `tel:${phone.replace(/[^+\d]/g, "")}`;

  const teamValue = [
    myDoctors.length > 0 ? `${myDoctors.length} ${myDoctors.length === 1 ? "doctor" : "doctors"}` : null,
    `${nurses} nurses`,
  ].filter(Boolean).join(" · ");

  const slides: Slide[] = [
    {
      pill: `${svc.length} key services`,
      title: `Expert ${dept.name} care`,
      text: dept.description ?? "",
      img: photos[0 % photos.length],
    },
    {
      pill: teamValue,
      title: "A dedicated team around you",
      text: "Specialists and nurses work from one shared patient record, so every visit builds on the last.",
      img: photos[1 % photos.length],
    },
    {
      pill: "What we treat",
      title: "Care that covers it all",
      text: svc.join(" · "),
      img: photos[2 % photos.length],
    },
    {
      pill: "Book online",
      title: "Book your visit in minutes",
      text: "Choose a doctor and a time that suits you — in person or by video visit.",
      img: photos[3 % photos.length],
    },
  ];

  /* "at a glance" values, split into a big line and a small line */
  const hoursParts = (dept.hours ?? "").split(" · ");
  const hoursBig = hoursParts[hoursParts.length - 1];
  const hoursSmall = hoursParts.length > 1 ? hoursParts.slice(0, -1).join(" · ") : dept.open24 ? "Walk-ins welcome" : "Opening hours";
  const locParts = (dept.location ?? "").split(" · ");
  const locBig = locParts[locParts.length - 1];
  const locSmall = locParts.length > 1 ? `${locParts.slice(0, -1).join(" · ")} — follow the signs for ${dept.name}` : "Where to find us";

  const glance = [
    { icon: iClock, big: hoursBig, small: hoursSmall },
    { icon: iPin, big: locBig, small: locSmall },
    {
      icon: iTeam,
      big: `${nurses} nurses`,
      small: myDoctors.length > 0
        ? `and ${myDoctors.length} ${myDoctors.length === 1 ? "doctor" : "doctors"} sharing one patient record`
        : "caring for you, with one shared patient record",
    },
  ];

  const stepList = [
    { label: "Before you come", title: "Prepare in minutes", text: dept.tip ?? "" },
    { label: "At the department", title: "Your appointment", text: dept.during ?? "" },
    { label: "After your visit", title: "Clear next steps", text: dept.after ?? "" },
  ];

  const fade = (delay = 0): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "none" : "translateY(24px)",
    transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
    transitionDelay: `${delay}ms`,
  });

  const reveal = (visible: boolean, delay = 0, y = 24): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? undefined : `translateY(${y}px)`,
    transitionDelay: `${delay}ms`,
  });

  return (
    <div>
      {/* Intro — name on the left, about on the right */}
      <section className="mx-auto max-w-6xl px-6 pb-[46px] pt-[46px]">
        <nav aria-label="Breadcrumb" className="text-xs text-[var(--muted)]" style={fade(0)}>
          <Link href="/department" className="hover:text-[var(--ink)]">Departments</Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--ink)]">{dept.name}</span>
        </nav>

        <div className="mt-8 grid items-start gap-10 md:grid-cols-2 md:gap-12">
          <div style={fade(100)}>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-tint)]/40 text-[var(--primary)]">
                {iconFor(dept.name)}
              </span>
              <span className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-1 font-mono text-[11px] text-[var(--muted)]">
                {dept.code}
              </span>
            </div>
            <h1 className="font-heading mt-6 max-w-xl text-4xl font-bold leading-[1.15] tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
              {dept.name}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              Specialist care, connected to your full health record.
            </p>
          </div>

          <div className="md:pt-4" style={fade(250)}>
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">About this department</h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{dept.description}</p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
              Your {dept.name} team shares one live record with our laboratory, pharmacy and other
              specialists — so you never repeat your history and every decision is made with the
              full picture.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="bg-[var(--primary)] text-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
              >
                <span className="roll">
                  <span className="r1">Book appointment</span>
                  <span className="r2" aria-hidden="true">Book appointment</span>
                </span>
              </Link>
              <Link
                href={`/doctors?department=${encodeURIComponent(dept.name)}`}
                className="bg-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
              >
                <span className="roll">
                  <span className="r1">See doctors</span>
                  <span className="r2" aria-hidden="true">See doctors</span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 lg:mt-16" style={fade(400)}>
          <DeptCarousel slides={slides} />
        </div>
      </section>

      {/* At a glance — slate panel: hours, location, phone, team */}
      <section ref={glanceRef} className="px-6 pb-[46px]">
        <div
          className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[var(--muted)] p-6 text-white transition-all duration-1000 ease-out sm:p-10 lg:p-12"
          style={reveal(glanceVisible, 0, 40)}
        >
          <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
            <p className="max-w-[230px] text-xs leading-relaxed text-white/70">
              Everything you need to plan your visit to {dept.name} — when we&apos;re open, where to
              find us and who will look after you.
            </p>

            <div>
              <h2 className="font-heading max-w-xl text-3xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Everything you need,<br className="hidden sm:block" /> before you arrive
              </h2>

              <div className="mt-10 grid gap-8 sm:grid-cols-3 lg:mt-14">
                {glance.map((g, n) => (
                  <div
                    key={g.small}
                    className="transition-all duration-700 ease-out"
                    style={reveal(glanceVisible, 250 + n * 130, 28)}
                  >
                    <span className="text-white/90">{g.icon}</span>
                    <p className="font-heading mt-6 break-words text-2xl font-medium leading-tight sm:text-3xl">{g.big}</p>
                    <p className="mt-3 max-w-[210px] text-xs leading-relaxed text-white/70">{g.small}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services — one card each */}
      <section ref={servicesRef} className={SECTION}>
        <div className="mx-auto max-w-6xl">
          <div className="text-center transition-all duration-700 ease-out" style={reveal(servicesVisible)}>
            <h2 className={H2}>What we offer</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--muted)] sm:text-base">
              Every {dept.name} service is delivered by our own specialists and nurses, with
              results and next steps sent to your patient portal.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {svc.map((c, n) => (
              <div
                key={c}
                className="flex min-h-[240px] flex-col justify-between rounded-3xl bg-[var(--primary-tint)] p-6 transition-all duration-700 ease-out hover:-translate-y-1 sm:min-h-[260px] sm:p-8"
                style={reveal(servicesVisible, 200 + n * 120, 40)}
              >
                <p className="max-w-[260px] text-sm leading-relaxed text-[var(--ink)]/70">
                  {serviceText(c, dept.name)}
                </p>
                <div className="mt-8">
                  <h3 className="font-heading text-2xl font-semibold leading-tight text-[var(--ink)] sm:text-3xl">
                    {c}
                  </h3>
                  {serviceChips(c).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {serviceChips(c).map((o) => (
                        <span key={o} className="rounded-full bg-white/60 px-3 py-1.5 text-[11px] text-[var(--ink)]/70">
                          {o}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Your visit, step by step — written for this department */}
      <section ref={stepsRef} className={SECTION}>
        <div className="mx-auto max-w-6xl">
          <div className="text-center transition-all duration-700 ease-out" style={reveal(stepsVisible)}>
            <h2 className={H2}>Your visit, step by step</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-[var(--muted)] sm:text-base">
              What to expect at {dept.name}, from the day you book to the day you&apos;re home.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6">
            {stepList.map((s, n) => (
              <div
                key={s.label}
                className="relative transition-all duration-700 ease-out"
                style={reveal(stepsVisible, 250 + n * 200, 36)}
              >
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] font-mono text-xs text-white">
                  0{n + 1}
                </span>
                {n < stepList.length - 1 && (
                  <span aria-hidden="true" className="absolute left-12 top-5 hidden h-px bg-[var(--primary-tint)] lg:block" style={{ right: "-16px" }} />
                )}
                <div className="mt-5 h-[calc(100%-3.75rem)] rounded-3xl bg-[var(--primary-tint)]/25 p-6 sm:p-8">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">{s.label}</p>
                  <h3 className="font-heading mt-3 text-xl font-semibold text-[var(--ink)]">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section className={SECTION}>
        <div className="mx-auto max-w-6xl">
          <h2 className={`${H2} text-center`}>Doctors in {dept.name}</h2>

          <div className="mt-10">
            {doctors === null ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[320px] animate-pulse rounded-3xl bg-[var(--primary-tint)]/20" />
                ))}
              </div>
            ) : myDoctors.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {myDoctors.map((d, i) => (
                  <DoctorTile key={`${d.id ?? i}-${d.name}`} d={d} />
                ))}
              </div>
            ) : (
              <p className="mx-auto max-w-md text-center text-sm text-[var(--muted)]">
                Our {dept.name} specialists will be listed here soon. You can browse every doctor in the meantime.
              </p>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-[var(--primary)] text-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
            >
              <span className="roll">
                <span className="r1">Book appointment</span>
                <span className="r2" aria-hidden="true">Book appointment</span>
              </span>
            </Link>
            <Link
              href={`/doctors?department=${encodeURIComponent(dept.name)}`}
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

      {/* When to get urgent help — specific to this department */}
      <section ref={urgentRef} className={SECTION}>
        <div
          className="mx-auto max-w-6xl rounded-3xl bg-[var(--primary-tint)]/25 p-6 transition-all duration-1000 ease-out sm:p-10"
          style={reveal(urgentVisible, 0, 40)}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="flex items-start gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-[var(--primary)]">
                {iAlert}
              </span>
              <div>
                <h2 className="font-heading text-xl font-semibold text-[var(--ink)] sm:text-2xl">
                  {dept.open24 ? "We're always here" : "When not to wait"}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                  {dept.open24 ? dept.urgent : `Go to Emergency or call us straight away if ${dept.urgent}`}
                </p>
              </div>
            </div>

            <a
              href={phoneHref}
              className="bg-[var(--primary)] text-[var(--primary-tint)] btn-hero btn-roll inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
            >
              <span className="roll">
                <span className="r1">Call {phone}</span>
                <span className="r2" aria-hidden="true">Call {phone}</span>
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}