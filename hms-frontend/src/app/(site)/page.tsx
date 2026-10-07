"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Info = { hospital_name: string; doctors: number; departments: number };
type Doctor = { name: string; specialization: string | null; department: string | null };

// ... services & faqs stay exactly the same ...

export default function HomePage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    api.get("/public/info").then((r) => setInfo(r.data)).catch(() => {});
    api.get("/public/doctors").then((r) => setDoctors(r.data.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero — clean design background + real HTML texts */}
      <section className="relative min-h-screen overflow-hidden bg-[var(--app-bg)]">
        <img
  src="/hero4.webp"
  alt=""
  className="absolute inset-0 h-full w-full select-none object-cover"
/>

        {/* Left content — the texts, as real HTML */}
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16 sm:px-12 sm:pt-24 lg:pt-32">
          <h1 className="font-heading max-w-xl text-5xl font-bold leading-[1.05] tracking-tight text-[var(--primary)] sm:text-6xl lg:text-7xl">
            Your health is<br />our goal.
          </h1>

          <p className="mt-8 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Our mission is to extend a well distinct health care distribution and
            sales services making its products available and keep its business
            partners and shareholders satisfied.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link
            href="/services"
            className=" bg-[var(--primary-tint)] btn-hero btn-roll inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs  uppercase "
          >
  <span className="roll">
    <span className="r1">Watch video</span>
    <span className="r2" aria-hidden="true">Watch video</span>
  </span>
  
</Link>
          </div>
        </div>
      </section>
      {/* ...rest of sections stay exactly the same... */}
    </div>
  );
}