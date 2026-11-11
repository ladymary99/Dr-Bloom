"use client";

/* All departments: /department
   Save as: app/department/page.tsx (next to the [slug] folder) */

import Link from "next/link";
import { useEffect, useState } from "react";
import { iconFor, norm, slugify, useDepartments } from "@/lib/departments";

const SECTION = "px-6 py-[46px]";

export default function DepartmentsPage() {
  const { list, loaded } = useDepartments();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const q = norm(query);
  const shown = q
    ? list.filter(
        (d) =>
          norm(d.name).includes(q) ||
          norm(d.code).includes(q) ||
          (d.services ?? []).some((s) => norm(s).includes(q))
      )
    : list;

  const fade = (delay = 0): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "none" : "translateY(24px)",
    transition: "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)",
    transitionDelay: `${delay}ms`,
  });

  return (
    <div>
      {/* Heading */}
      <section className={SECTION}>
        <div className="mx-auto max-w-6xl text-center" style={fade(0)}>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
            Our departments
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            Full-service care across {list.length} departments — choose one to see its services
            and doctors, or book an appointment online.
          </p>

          {/* search */}
          <div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-full border border-[var(--border)] bg-white px-5 py-3 shadow-sm focus-within:border-[var(--primary-tint)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments or services"
              aria-label="Search departments"
              className="w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]/70"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 pb-[46px]">
        <div className="mx-auto max-w-6xl">
          {!loaded && list.length === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="min-h-[340px] animate-pulse rounded-3xl bg-[var(--primary-tint)]/20" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--muted)]">
              No department matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {shown.map((d, i) => {
                const href = `/department/${slugify(d.name)}`;
                return (
                  <div
                    key={`${d.code}-${d.id}`}
                    className="flex min-h-[340px] flex-col overflow-hidden rounded-3xl bg-[var(--primary-tint)]/25 p-6 lg:p-8"
                    style={fade(150 + (i % 3) * 100)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-[var(--muted)]">{iconFor(d.name)}</div>
                      <span className="rounded-full bg-white/60 px-3 py-1 font-mono text-[11px] text-[var(--muted)]">
                        {d.code}
                      </span>
                    </div>

                    <h2 className="font-heading mt-6 text-xl font-semibold leading-snug text-[var(--ink)] lg:mt-8">
                      <Link href={href} className="hover:text-[var(--primary)]">{d.name}</Link>
                    </h2>
                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[var(--muted)]">
                      {d.description}
                    </p>

                    <div className="mt-auto flex flex-wrap gap-2 pt-6">
                      {d.services?.map((c) => (
                        <span key={c} className="rounded-full bg-white/60 px-3 py-1 text-[10px] text-[var(--muted)]">
                          {c}
                        </span>
                      ))}
                    </div>

                    {d.open24 && (
                      <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-[var(--muted)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Open 24/7
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/60 pt-5">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary)] transition-all hover:gap-3"
                      >
                        View department
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                      <Link
                        href={`/doctors?department=${encodeURIComponent(d.name)}`}
                        className="text-[11px] text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
                      >
                        See doctors
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              href="/register"
              className="bg-[var(--primary)] text-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs uppercase"
            >
              <span className="roll">
                <span className="r1">Book appointment</span>
                <span className="r2" aria-hidden="true">Book appointment</span>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}