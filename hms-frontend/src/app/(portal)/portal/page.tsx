"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type PortalData = {
  patient: { mrn: string; first_name: string; last_name: string; blood_type: string | null; allergies: string | null };
  next_appointment: {
    appointment_at: string; status: string; reason: string | null;
    doctor: { user: { name: string } } | null;
    department: { name: string } | null;
  } | null;
  stats: { upcoming: number; past: number; visits: number; prescriptions: number; pending_bills: number };
};

export default function PortalDashboard() {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/me").then((response) => setData(response.data)).catch(() => setError("Could not load your patient information."));
  }, []);

  if (error) return <p role="alert" className="py-16 text-center text-red-700">{error}</p>;
  if (!data) return <p className="py-16 text-center text-slate-500">Loading your portal…</p>;

  const { patient, next_appointment: nextAppointment, stats } = data;
  const cards = [
    { label: "Upcoming appointments", value: stats.upcoming, href: "/portal/appointments", icon: "◷" },
    { label: "Past visits", value: stats.past, href: "/portal/appointments", icon: "▦" },
    { label: "Prescriptions", value: stats.prescriptions, href: "/portal/records", icon: "+" },
    { label: "Pending bills", value: stats.pending_bills, href: "/portal/billing", icon: "$" },
  ];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-700">Patient portal</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Hello, {patient.first_name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Medical record <span className="font-medium text-blue-800">{patient.mrn}</span>
            {patient.blood_type && <span className="ml-3">Blood type <b className="text-slate-700">{patient.blood_type}</b></span>}
          </p>
        </div>
        {patient.allergies && <p className="max-w-md border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800"><b>Allergies:</b> {patient.allergies}</p>}
      </header>

      <section aria-label="Patient statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="border-y border-slate-200 bg-white px-4 py-4 transition hover:border-blue-300 sm:border sm:px-5">
            <span aria-hidden className="text-lg text-blue-700">{card.icon}</span>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.label}</div>
          </Link>
        ))}
      </section>

      <section className="border-y border-slate-200 bg-white px-5 py-5 sm:border sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Next appointment</h2>
            <p className="mt-1 text-sm text-slate-500">Your upcoming care at Dr-Bloom Hospital</p>
          </div>
          <Link href="/portal/book" className="rounded-full bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Book appointment</Link>
        </div>
        {nextAppointment ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-l-4 border-blue-600 bg-blue-50 px-4 py-4">
            <div>
              <p className="font-medium text-slate-900">{new Date(nextAppointment.appointment_at).toLocaleString([], { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
              <p className="mt-1 text-sm text-slate-600">{nextAppointment.doctor?.user?.name ?? "Care team"} · {nextAppointment.department?.name ?? "Hospital"}{nextAppointment.reason ? ` · ${nextAppointment.reason}` : ""}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-blue-800">{nextAppointment.status.replaceAll("_", " ")}</span>
          </div>
        ) : <p className="mt-5 text-sm text-slate-500">No upcoming appointments are scheduled.</p>}
      </section>
    </div>
  );
}
