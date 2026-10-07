"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Dept = { id: number; name: string; code: string; description: string | null };

export default function ServicesPage() {
  const [depts, setDepts] = useState<Dept[]>([]);

  useEffect(() => {
    api.get("/departments").then((r) => setDepts(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-b from-blue-50/60 to-white px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Our services</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
          Full-service care across {depts.length || "multiple"} departments — book any of them online.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-xl font-bold text-slate-900">Departments</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {depts.map((d) => (
            <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">🏥</div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">{d.code}</span>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{d.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{d.description ?? "Consultations, diagnostics and treatment."}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate-500">
          💊 Pharmacy · 🧪 Laboratory · 🛏️ Wards & ICU · 🚑 24/7 Emergency — all connected to one patient record.
        </p>

        <div className="mt-14 rounded-3xl bg-blue-600 px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-white">Book any department online</h2>
          <Link href="/register" className="mt-6 inline-block rounded-full bg-white px-8 py-3 font-medium text-blue-700 hover:bg-blue-50">
            Get started
          </Link>
        </div>
      </section>
    </div>
  );
}