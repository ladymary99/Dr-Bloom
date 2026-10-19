"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type DepartmentData = {
  department: { id: number; name: string; code: string; description: string | null } | null;
  team: {
    id: number;
    employee_code: string;
    position: string;
    specialization: string | null;
    user: { name: string; email: string };
  }[];
  stats: { staff: number; appointments: number };
};

const cardClass = "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm";

export default function MyDepartmentPage() {
  const [data, setData] = useState<DepartmentData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/doctor/department")
      .then((response) => setData(response.data))
      .catch(() => setError("Could not load your department."));
  }, []);

  if (error) {
    return <p role="alert" className="rounded-3xl border border-red-200 bg-white p-8 text-center text-sm text-red-700">{error}</p>;
  }
  if (!data) {
    return <div className={`${cardClass} animate-pulse py-16`} aria-label="Loading department" />;
  }
  if (!data.department) {
    return (
      <div className={cardClass}>
        <h1 className="font-heading text-2xl font-bold text-[var(--ink)]">My Department</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">No department is assigned to your staff profile yet.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <header>
        <p className="text-sm font-medium text-[var(--primary)]">Doctor workspace</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">My Department</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Department information and active team members.</p>
      </header>

      <section className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">{data.department.code}</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold text-[var(--ink)]">{data.department.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{data.department.description || "No department description."}</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-[var(--primary-tint)]/15 px-5 py-4 text-center">
              <div className="font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">{data.stats.staff}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">Active staff</div>
            </div>
            <div className="rounded-2xl bg-[var(--primary-tint)]/15 px-5 py-4 text-center">
              <div className="font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">{data.stats.appointments}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">Appointments</div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${cardClass} !p-0 overflow-hidden`}>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="font-heading font-semibold text-[var(--ink)]">Department team</h2>
        </div>
        {data.team.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-[var(--muted)]">No active team members found.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]/60">
            {data.team.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="font-medium text-[var(--ink)]">{member.user.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{member.user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm capitalize text-[var(--ink)]">{member.position.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {member.specialization || member.employee_code}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
