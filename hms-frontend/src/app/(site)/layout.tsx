"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/department", label: "Departments" },
  { href: "/doctors", label: "Doctors" },
  { href: "/contact", label: "Contact" },
];

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

  return (
    <div className="min-h-screen text-[var(--ink)]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* logo — no roll animation, kept as-is */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-heading text-lg font-semibold">Dr&apos;Bloom</span>
          </Link>

          {/* nav links — same roll hover as the buttons */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`btn-roll rounded-full px-4 py-2 text-sm font-medium ${
                  pathname === l.href
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                <span className="roll">
                  <span className="r1">{l.label}</span>
                  <span className="r2" aria-hidden="true">{l.label}</span>
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
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
        </div>
      </header>

      {children}

      {/* Footer — big rounded gradient panel */}
      <footer className="px-4 pb-6 pt-4">
        <div className="mx-auto flex min-h-[620px] max-w-6xl flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#b2c2ea] via-[#98abdf] to-[#6684b8] ">
          <div className="grid gap-14 p-10 py-16 md:grid-cols-2 md:p-14 md:py-20">
            {/* left: link column — same roll hover */}
            <ul className="space-y-4">
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
              {/* overlapping doctor photos */}
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

          {/* bottom row: bigger logo + contact */}
          <div className="flex flex-col gap-8 p-10 pt-0 md:flex-row md:items-end md:justify-between md:p-14 md:pt-0">
            <span className="font-heading text-6xl font-bold leading-none text-white sm:text-7xl">
              Dr&apos;Bloom
            </span>

            <ul className="space-y-2.5 text-sm text-white/90">
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z" />
                </svg>
                +93 700 000 000
              </li>
              <li className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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