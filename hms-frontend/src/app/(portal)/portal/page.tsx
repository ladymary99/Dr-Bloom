"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import PatientFiles from "@/components/PatientFiles";

type PortalData = {
  patient: { id: string; mrn: string; first_name: string; last_name: string; blood_type: string | null; allergies: string | null };
  next_appointment: {
    appointment_at: string; status: string; reason: string | null;
    doctor: { user: { name: string } } | null;
    department: { name: string } | null;
  } | null;
  stats: { upcoming: number; past: number; visits: number; prescriptions: number; pending_bills: number };
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

const iconProps = {
  className: "h-6 w-6",
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

export default function PortalDashboard() {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/me").then((response) => setData(response.data)).catch(() => setError("Could not load your patient information."));
  }, []);

  if (error) {
    return (
      <div className={`${cardCls} p-12 text-center`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg {...iconProps} className="h-5 w-5 text-red-500"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl border border-[var(--border)] bg-white" />
        ))}
      </div>
    );
  }

  const { patient, next_appointment: nextAppointment, stats } = data;

  const cards = [
    {
      label: "Upcoming appointments", value: stats.upcoming, href: "/portal/appointments",
      icon: <svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>,
    },
    {
      label: "Past visits", value: stats.past, href: "/portal/appointments",
      icon: <svg {...iconProps}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/></svg>,
    },
    {
      label: "Prescriptions", value: stats.prescriptions, href: "/portal/records",
      icon: <svg {...iconProps}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>,
    },
    {
      label: "Pending bills", value: stats.pending_bills, href: "/portal/billing",
      icon: <svg {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1-1.3-1.5-3-1.5s-3 .6-3 1.75c0 2.5 6 1.25 6 3.75 0 1.15-1.3 1.75-3 1.75s-3-.5-3-1.5"/></svg>,
    },
  ];

  return (
    <div className="animate-fade-up w-full space-y-6">
      {/* Greeting header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">
            Hello, {patient.first_name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Medical record <span className="font-medium text-[var(--primary)]">{patient.mrn}</span>
            {patient.blood_type && (
              <span className="ml-3">
                Blood type{" "}
                <span className="rounded-full bg-[var(--primary-tint)]/25 px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                  {patient.blood_type}
                </span>
              </span>
            )}
          </p>
        </div>
        <Link href="/portal/book"
          className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
          + Book appointment
        </Link>
      </div>

      {/* Allergies alert */}
      {patient.allergies && (
        <div className="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 px-5 py-4">
          <svg {...iconProps} className="mt-0.5 h-5 w-5 flex-none text-red-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01"/></svg>
          <p className="text-sm text-red-800"><b>Allergies:</b> {patient.allergies}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}
            className={`${cardCls} !p-5 block hover:-translate-y-0.5`}>
            <span className="text-[var(--primary)]" aria-hidden>{card.icon}</span>
            <div className="mt-3 font-heading text-3xl font-bold tabular-nums text-[var(--ink)]">{card.value}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Next appointment */}
      <div className={`${cardCls} overflow-hidden !p-0`}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="font-heading font-semibold text-[var(--ink)]">Next appointment</h2>
          <Link href="/portal/appointments" className="text-xs font-medium text-[var(--primary)] hover:underline">
            View all →
          </Link>
        </div>
        <div className="p-6">
          {nextAppointment ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--primary-tint)]/50 bg-[var(--primary-tint)]/15 px-5 py-4">
              <div>
                <p className="font-heading font-semibold tabular-nums text-[var(--ink)]">
                  {new Date(nextAppointment.appointment_at).toLocaleString([], {
                    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {nextAppointment.doctor?.user?.name ?? "Care team"} · {nextAppointment.department?.name ?? "Hospital"}
                  {nextAppointment.reason ? ` · ${nextAppointment.reason}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-[var(--primary)] shadow-sm">
                {nextAppointment.status.replaceAll("_", " ")}
              </span>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-[var(--muted)]">No upcoming appointments are scheduled.</p>
              <Link href="/portal/book" className="mt-2 inline-block text-sm font-medium text-[var(--primary)] hover:underline">
                Book one now →
              </Link>
            </div>
          )}
        </div>
      </div>

      <PatientFiles basePath="/portal" patientName={`${patient.first_name} ${patient.last_name}`} canDelete />
    </div>
  );
}