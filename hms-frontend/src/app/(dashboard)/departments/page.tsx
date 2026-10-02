"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Department = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  staff_count: number;
  appointments_count: number;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/departments")
      .then((r) => setDepartments(r.data))
      .catch(() => setError("Could not load departments."));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
        <p className="mt-1 text-sm text-slate-500">
          {departments ? `${departments.length} active departments` : "Loading…"}
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-12 text-center text-red-600">{error}</div>
      ) : !departments ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <Link
              key={d.id}
              href={`/departments/${d.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">🏥</div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">{d.code}</span>
              </div>
              <h2 className="mt-4 font-semibold text-slate-900">{d.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{d.description ?? "No description."}</p>
              <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <span><b className="font-semibold text-slate-900">{d.staff_count}</b> staff</span>
                <span><b className="font-semibold text-slate-900">{d.appointments_count}</b> appointments</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}