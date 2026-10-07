"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/doctors", label: "Doctors" },
  { href: "/contact", label: "Contact" },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--ink)]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
           
            <span className="font-heading text-lg font-semibold">Dr'Bloom</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  pathname === l.href
                    ? "text-[var(--font-heading)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
  href="/login"
  className="btn-hero btn-roll border border-[var(--primary-tint)]   text-[var(--muted)] items-center gap-2 rounded-full px-5 py-2 text-xs  uppercase"
>
  <span className="roll">
    <span className="r1">Sign in</span>
    <span className="r2" aria-hidden="true">Sign in</span>
  </span>
</Link>
            
            <Link
  href="/register"
  className="btn-hero btn-roll items-center gap-2 rounded-full px-5 py-2 text-xs  uppercase bg-[var(--primary-tint)]"
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

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="font-heading flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-bold text-white">
                D
              </div>
              <span className="font-heading font-semibold">Dr-Bloom Hospital</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Modern, compassionate healthcare for your whole family — from emergency care to online appointments.
            </p>
          </div>
          <div>
            <div className="font-heading text-sm font-semibold text-[var(--ink)]">Quick links</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition hover:text-[var(--primary)]">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-heading text-sm font-semibold text-[var(--ink)]">Patient portal</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li><Link href="/register" className="transition hover:text-[var(--primary)]">Create account</Link></li>
              <li><Link href="/login" className="transition hover:text-[var(--primary)]">Book appointment</Link></li>
              <li><Link href="/login" className="transition hover:text-[var(--primary)]">My records</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-heading text-sm font-semibold text-[var(--ink)]">Contact</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>📍 Kabul, Afghanistan</li>
              <li>📞 +93 700 000 000</li>
              <li>✉️ info@drbloom.test</li>
              <li>🕐 Open 24/7 for emergencies</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--border)] py-5 text-center text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} Dr-Bloom Hospital. All rights reserved.
        </div>
      </footer>
    </div>
  );
}