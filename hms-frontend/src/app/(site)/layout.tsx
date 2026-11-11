"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { iconFor, slugify, useDepartments } from "@/lib/departments";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/department", label: "Departments", dropdown: true },
  { href: "/doctors", label: "Doctors" },
  { href: "/contact", label: "Contact" },
];

const Chevron = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const footerLinks = [
  { href: "/about", label: "Why Dr-Bloom" },
  { href: "/contact", label: "Privacy Policy" },
  { href: "/department", label: "Our Departments" },
  { href: "/doctors", label: "Our Doctors" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Terms and Conditions" },
];

/* doctor photos for the footer avatars — swap these paths for your real photos */
const footerDoctors = [
  { img: "/doc1.webp", name: "Dr. Sarah Khan" },
  { img: "/doc2.webp", name: "Dr. Karim Nazari" },
  { img: "/doc3.webp", name: "Dr. Maya Anderson" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dd, setDd] = useState(false);   // desktop departments dropdown
  const [mDd, setMDd] = useState(false); // departments accordion inside the mobile menu
  const { list: depts } = useDepartments();
  const ddTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previousPathname, setPreviousPathname] = useState(pathname);

  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setOpen(false);
    setDd(false);
    setMDd(false);
  }

  const openDd = () => {
    if (ddTimer.current) clearTimeout(ddTimer.current);
    setDd(true);
  };
  const closeDdSoon = () => {
    if (ddTimer.current) clearTimeout(ddTimer.current);
    ddTimer.current = setTimeout(() => setDd(false), 160);
  };

  /* dropdown: close with Escape or a click outside */
  useEffect(() => {
    if (!dd) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDd(false); };
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-dd]")) setDd(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [dd]);

  /* lock page scroll while the menu is open + close with Escape */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* if the screen grows to desktop while open, close it */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => { if (mq.matches) setOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* staggered reveal for items inside the menu */
  const item = (i: number): React.CSSProperties => ({
    opacity: open ? 1 : 0,
    transform: open ? "none" : "translateY(28px)",
    transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
    transitionDelay: open ? `${200 + i * 70}ms` : "0ms",
  });

  return (
    <div className="min-h-screen text-[var(--ink)]">
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/90 backdrop-blur"
      >
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-heading text-lg font-semibold">Dr&apos;Bloom</span>
          </Link>

          {/* desktop nav links */}
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => {
              const active = l.dropdown ? pathname.startsWith("/department") : pathname === l.href;
              const cls = `btn-roll rounded-full px-4 py-2 text-sm font-medium ${
                active ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`;
              const label = (
                <span className="roll">
                  <span className="r1">{l.label}</span>
                  <span className="r2" aria-hidden="true">{l.label}</span>
                </span>
              );

              if (!l.dropdown) {
                return (
                  <Link key={l.href} href={l.href} className={cls}>
                    {label}
                  </Link>
                );
              }

              return (
                <div
                  key={l.href}
                  data-dd
                  className="flex items-center"
                  onMouseEnter={openDd}
                  onMouseLeave={closeDdSoon}
                >
                  <Link href={l.href} className={`${cls} pr-1`} onClick={() => setDd(false)}>
                    {label}
                  </Link>
                  <button
                    type="button"
                    aria-label="Show departments"
                    aria-expanded={dd}
                    aria-controls="dept-menu"
                    onClick={() => setDd((o) => !o)}
                    className="-ml-0.5 flex h-8 w-7 items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)]"
                  >
                    <Chevron className={`transition-transform duration-500 ${dd ? "rotate-180" : ""}`} />
                  </button>
                </div>
              );
            })}
          </nav>

          {/* desktop buttons */}
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/login"
              className="btn-hero btn-roll border border-[var(--primary-tint)] text-[var(--muted)] items-center gap-2 rounded-full px-5 py-2 text-xs uppercase"
            >
              <span className="roll">
                <span className="r1">Sign in</span>
                <span className="r2" aria-hidden="true">Sign in</span>
              </span>
            </Link>

            <Link
              href="/register"
              className="btn-hero btn-roll items-center gap-2 rounded-full px-5 py-2 text-xs uppercase bg-[var(--primary-tint)]"
            >
              <span className="roll">
                <span className="r1">Book appointment</span>
                <span className="r2" aria-hidden="true">Book appointment</span>
              </span>
            </Link>
          </div>

          {/* burger — tablet + phone */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="-mr-2 flex h-11 items-center gap-3 rounded-full px-2 lg:hidden"
          >
            <span className="relative h-4 overflow-hidden text-[11px] font-semibold uppercase leading-4 tracking-[0.2em] text-[var(--muted)]">
              <span
                className="block transition-transform duration-500 ease-out"
                style={{ transform: open ? "translateY(-100%)" : "none" }}
              >
                Menu
              </span>
              <span
                className="block transition-transform duration-500 ease-out"
                style={{ transform: open ? "translateY(-100%)" : "none" }}
              >
                Close
              </span>
            </span>
            <span className="relative block h-6 w-6">
              <span
                className="absolute left-0 top-1/2 h-[2px] w-6 rounded-full bg-[var(--ink)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: open ? "translateY(-50%) rotate(45deg)" : "translateY(-5px)" }}
              />
              <span
                className="absolute left-0 top-1/2 h-[2px] w-6 rounded-full bg-[var(--ink)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ transform: open ? "translateY(-50%) rotate(-45deg)" : "translateY(3px)" }}
              />
            </span>
          </button>

          {/* departments dropdown — desktop */}
          <div
            id="dept-menu"
            data-dd
            onMouseEnter={openDd}
            onMouseLeave={closeDdSoon}
            aria-hidden={!dd}
            className="absolute inset-x-6 top-full hidden pt-2 lg:block"
            style={{
              opacity: dd ? 1 : 0,
              visibility: dd ? "visible" : "hidden",
              transform: dd ? "none" : "translateY(-14px) scale(0.98)",
              transformOrigin: "top center",
              transition: `opacity 450ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1), visibility 0s linear ${dd ? 0 : 450}ms`,
            }}
          >
            <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-2xl shadow-[var(--primary)]/15">
              <div className="flex items-center justify-between px-8 pt-7">
                <div>
                  <p className="font-heading text-lg font-semibold text-[var(--ink)]">Our departments</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{depts.length} departments — pick one to see its services and doctors</p>
                </div>
                <Link
                  href="/department"
                  onClick={() => setDd(false)}
                  tabIndex={dd ? 0 : -1}
                  className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary)] transition-all hover:gap-3"
                >
                  View all
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>

              <ul className="grid max-h-[62vh] gap-x-2 gap-y-1 overflow-y-auto p-5 lg:grid-cols-3 xl:grid-cols-4">
                {depts.map((d, i) => (
                  <li
                    key={`${d.code}-${d.id}`}
                    style={{
                      opacity: dd ? 1 : 0,
                      transform: dd ? "none" : "translateY(12px)",
                      transition: "opacity 500ms cubic-bezier(0.16,1,0.3,1), transform 500ms cubic-bezier(0.16,1,0.3,1)",
                      transitionDelay: dd ? `${120 + i * 18}ms` : "0ms",
                    }}
                  >
                    <Link
                      href={`/department/${slugify(d.name)}`}
                      onClick={() => setDd(false)}
                      tabIndex={dd ? 0 : -1}
                      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--primary-tint)]/25 hover:text-[var(--ink)]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-tint)]/25 text-[var(--primary)] [&>svg]:h-5 [&>svg]:w-5">
                        {iconFor(d.name)}
                      </span>
                      <span className="font-medium leading-snug">{d.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop — dims the page, tap to close */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 bg-[var(--ink)]/30 backdrop-blur-sm lg:hidden"
        style={{
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: `opacity 600ms ease, visibility 0s linear ${open ? 0 : 600}ms`,
        }}
      />

      {/* Mobile / tablet menu — side panel (300px phone, 420px tablet) sliding in from the right */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className="fixed inset-y-0 right-0 z-40 w-[300px] max-w-[88vw] overflow-y-auto rounded-l-3xl bg-white shadow-2xl shadow-[var(--primary)]/20 sm:w-[420px] lg:hidden"
        style={{
          transform: open ? "translateX(0)" : "translateX(105%)",
          visibility: open ? "visible" : "hidden",
          transition: `transform ${open ? 800 : 600}ms cubic-bezier(0.16,1,0.3,1), visibility 0s linear ${open ? 0 : 600}ms`,
        }}
      >
        <div className="flex min-h-full flex-col items-center px-6 pb-[46px] pt-24 text-center">
          {/* links */}
          <nav aria-label="Main">
            <ul className="space-y-1">
              {links.map((l, i) =>
                l.dropdown ? (
                  <li key={l.href} style={item(i)}>
                    <button
                      type="button"
                      aria-expanded={mDd}
                      aria-controls="mobile-depts"
                      onClick={() => setMDd((o) => !o)}
                      tabIndex={open ? 0 : -1}
                      className={`font-heading inline-flex items-center gap-2 py-1.5 text-3xl font-semibold tracking-tight sm:text-4xl ${
                        pathname.startsWith("/department") ? "text-[var(--primary)]" : "text-[var(--ink)]"
                      }`}
                    >
                      {l.label}
                      <Chevron className={`h-5 w-5 transition-transform duration-500 ${mDd ? "rotate-180" : ""}`} />
                    </button>

                    {/* accordion — all departments */}
                    <div
                      id="mobile-depts"
                      className="grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{ gridTemplateRows: mDd ? "1fr" : "0fr", opacity: mDd ? 1 : 0 }}
                    >
                      <div className="overflow-hidden">
                        <ul className="max-h-[38vh] space-y-0.5 overflow-y-auto py-2">
                          <li>
                            <Link
                              href="/department"
                              onClick={() => setOpen(false)}
                              tabIndex={open && mDd ? 0 : -1}
                              className="block rounded-full px-4 py-2 text-sm font-semibold text-[var(--primary)]"
                            >
                              All departments
                            </Link>
                          </li>
                          {depts.map((d) => (
                            <li key={`${d.code}-${d.id}`}>
                              <Link
                                href={`/department/${slugify(d.name)}`}
                                onClick={() => setOpen(false)}
                                tabIndex={open && mDd ? 0 : -1}
                                className={`block rounded-full px-4 py-2 text-sm ${
                                  pathname === `/department/${slugify(d.name)}`
                                    ? "bg-[var(--primary-tint)]/25 font-semibold text-[var(--primary)]"
                                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                                }`}
                              >
                                {d.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ) : (
                  <li key={l.href} style={item(i)}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      tabIndex={open ? 0 : -1}
                      className={`btn-roll font-heading inline-block py-1.5 text-3xl font-semibold tracking-tight sm:text-4xl ${
                        pathname === l.href ? "text-[var(--primary)]" : "text-[var(--ink)]"
                      }`}
                    >
                      <span className="roll">
                        <span className="r1">{l.label}</span>
                        <span className="r2" aria-hidden="true">{l.label}</span>
                      </span>
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>

          {/* divider */}
          <div
            className="mt-8 h-px w-full origin-left bg-[var(--primary-tint)]"
            style={{
              transform: open ? "scaleX(1)" : "scaleX(0)",
              transition: "transform 900ms cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: open ? `${200 + links.length * 70}ms` : "0ms",
            }}
          />

          {/* buttons */}
          <div className="mt-8 flex w-full flex-col gap-3" style={item(links.length + 1)}>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="btn-hero btn-roll inline-flex items-center justify-center gap-2 rounded-full border border-[var(--primary-tint)] px-8 py-3 text-xs uppercase text-[var(--muted)]"
            >
              <span className="roll">
                <span className="r1">Sign in</span>
                <span className="r2" aria-hidden="true">Sign in</span>
              </span>
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              tabIndex={open ? 0 : -1}
              className="btn-hero btn-roll inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary-tint)] px-8 py-3 text-xs uppercase"
            >
              <span className="roll">
                <span className="r1">Book appointment</span>
                <span className="r2" aria-hidden="true">Book appointment</span>
              </span>
            </Link>
          </div>

          {/* tagline + contact */}
          <div className="mt-auto space-y-2 pt-10 text-center" style={item(links.length + 2)}>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-[var(--muted)]">
              Advanced healthcare, experienced specialists and patient-centered care — open 24/7.
            </p>
            <a
              href="tel:+93700000000"
              tabIndex={open ? 0 : -1}
              className="font-heading block text-sm font-semibold text-[var(--primary)]"
            >
              +93 700 000 000
            </a>
          </div>
        </div>
      </div>

      {children}

      {/* Footer — big rounded gradient panel */}
      <footer className="px-6 pb-6 pt-4">
        <div className="mx-auto flex min-h-[520px] max-w-6xl flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#b2c2ea] via-[#98abdf] to-[#6684b8] md:min-h-[620px]">
          <div className="grid gap-10 p-6 py-12 sm:p-10 sm:py-14 md:grid-cols-2 md:gap-14 md:p-14 md:py-20">
            {/* left: link column */}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-1 md:space-y-0">
              {footerLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="btn-roll inline-block text-sm font-medium text-white/90 hover:text-white">
                    <span className="roll">
                      <span className="r1">{l.label}</span>
                      <span className="r2" aria-hidden="true">{l.label}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* right: heading + doctor avatars */}
            <div>
              <h2 className="font-heading max-w-sm text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Complete care for every stage of your life
              </h2>
              <div className="mt-6 flex -space-x-3">
                {footerDoctors.map((d) => (
                  <img
                    key={d.name}
                    src={d.img}
                    alt={d.name}
                    title={d.name}
                    className="h-12 w-12 rounded-full border-2 border-white/80 object-cover shadow-md"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* bottom row: logo + contact */}
          <div className="flex flex-col gap-8 p-6 pt-0 sm:p-10 sm:pt-0 md:flex-row md:items-end md:justify-between md:p-14 md:pt-0">
            <span className="font-heading text-5xl font-bold leading-none text-white sm:text-7xl">
              Dr&apos;Bloom
            </span>

            <ul className="space-y-2.5 text-sm text-white/90">
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />
                </svg>
                +93 700 000 000
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>
                </svg>
                info@drbloom.test
              </li>
              <li className="text-white/70">Dr-Bloom Hospital, Kabul, Afghanistan</li>
            </ul>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} Dr-Bloom Hospital. All rights reserved.
        </p>
      </footer>
    </div>
  );
}