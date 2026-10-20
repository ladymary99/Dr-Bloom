"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type VisitRecord = {
  id: string;
  visited_at: string;
  type: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  notes: string | null;
  doctor: { user: { name: string } } | null;
  prescription: {
    notes: string | null;
    items: { medicine_name: string; dosage: string; frequency: string; duration_days: number | null; instructions: string | null }[];
  } | null;
};

type LabTest = {
  id: number;
  test_name: string;
  status: string;
  result: string | null;
  created_at: string;
  doctor: { user: { name: string } } | null;
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm";

const pill: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
  ordered: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  in_progress: "bg-amber-100 text-amber-700",
};

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

export default function RecordsPage() {
  const [visits, setVisits] = useState<VisitRecord[] | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/records").then((response) => setVisits(response.data)).catch(() => setError("Could not load medical records."));
    api.get("/portal/lab-tests").then((response) => setLabTests(response.data)).catch(() => {});
  }, []);

  return (
    <div className="animate-fade-up w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Medical records</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Visits, diagnoses, and prescriptions recorded by your care team.</p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg {...iconProps} className="h-4 w-4 flex-none"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Visit records */}
        {!visits ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl border border-[var(--border)] bg-white" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className={`${cardCls} p-12 text-center`}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No medical records are available yet.</p>
          </div>
        ) : (
          visits.map((visit) => (
            <article key={visit.id} className={`${cardCls} overflow-hidden`}>
              {/* visit header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)]/60 bg-[var(--primary-tint)]/10 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <time className="font-heading font-semibold tabular-nums text-[var(--ink)]">
                    {new Date(visit.visited_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
                  </time>
                  <span className="rounded-full bg-[var(--primary-tint)]/25 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                    {visit.type}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <svg {...iconProps} className="h-3.5 w-3.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {visit.doctor?.user?.name ?? "Care team"}
                </span>
              </div>

              <div className="px-6 py-5">
                {visit.chief_complaint && (
                  <p className="text-sm text-[var(--muted)]"><b className="font-medium text-[var(--ink)]">Reason:</b> {visit.chief_complaint}</p>
                )}
                {visit.diagnosis && (
                  <p className="mt-1.5 text-sm text-[var(--muted)]"><b className="font-medium text-[var(--ink)]">Diagnosis:</b> {visit.diagnosis}</p>
                )}
                {visit.notes && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--muted)]"><b className="font-medium text-[var(--ink)]">Notes:</b> {visit.notes}</p>
                )}

                {/* prescription block */}
                {visit.prescription && (
                  <div className="mt-4 rounded-2xl border border-[var(--primary-tint)]/50 bg-[var(--primary-tint)]/15 px-5 py-4">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                      <svg {...iconProps} className="h-4 w-4 text-[var(--primary)]"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                      Prescription
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {visit.prescription.items.map((item, index) => (
                        <li key={`${visit.id}-${index}`} className="rounded-xl bg-white px-3.5 py-2.5 text-sm text-[var(--muted)] shadow-sm">
                          <b className="font-medium text-[var(--ink)]">{item.medicine_name}</b>
                          {" · "}{item.dosage} · {item.frequency}
                          {item.duration_days ? ` for ${item.duration_days} days` : ""}
                          {item.instructions ? ` · ${item.instructions}` : ""}
                        </li>
                      ))}
                    </ul>
                    {visit.prescription.notes && (
                      <p className="mt-3 text-xs text-[var(--muted)]">{visit.prescription.notes}</p>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))
        )}

        {/* Lab results */}
        {labTests.length > 0 && (
          <section className={`${cardCls} overflow-hidden`}>
            <div className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
              <h2 className="font-heading font-semibold text-[var(--ink)]">Lab results ({labTests.length})</h2>
            </div>
            <ul className="divide-y divide-[var(--border)]/60">
              {labTests.map((test) => (
                <li key={test.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--ink)]">{test.test_name}</span>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${pill[test.status] ?? "bg-[var(--primary-tint)]/15 text-[var(--muted)]"}`}>
                      {test.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-[var(--muted)]">
                    {new Date(test.created_at).toLocaleDateString()}
                    {test.doctor?.user?.name ? ` · Dr. ${test.doctor.user.name}` : ""}
                  </p>
                  {test.result && (
                    <p className="mt-3 whitespace-pre-wrap rounded-xl border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-[var(--ink)]">
                      {test.result}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}