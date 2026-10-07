"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Doctor = { name: string; specialization: string | null; department: string | null };

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);

  useEffect(() => {
    api.get("/public/doctors").then((r) => setDoctors(r.data)).catch(() => setDoctors([]));
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-b from-blue-50/60 to-white px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Our doctors</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
          Certified specialists across every department — book any of them online.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        {!doctors ? (
          <div className="py-16 text-center text-slate-500">Loading…</div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center text-slate-500">No doctors listed yet.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <div key={d.name} className="rounded-2xl border border-slate-200 bg-white p-7 text-center transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
                  {d.name.replace("Dr. ", "").charAt(0)}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{d.name}</h3>
                <p className="text-sm text-blue-700">{d.specialization ?? "Specialist"}</p>
                <p className="mt-1 text-xs text-slate-500">{d.department ?? ""}</p>
                <Link href="/register" className="mt-5 inline-block rounded-full bg-blue-600 px-5 py-2 text-xs font-medium text-white hover:bg-blue-700">
                  Book appointment
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}