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

export default function RecordsPage() {
  const [visits, setVisits] = useState<VisitRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/portal/records").then((response) => setVisits(response.data)).catch(() => setError("Could not load medical records."));
  }, []);

  return (
    <div>
      <header>
        <p className="text-sm font-medium text-blue-700">Your care history</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Medical records</h1>
        <p className="mt-1 text-sm text-slate-500">Visits, diagnoses, and prescriptions recorded by your care team.</p>
      </header>

      {error ? <p role="alert" className="mt-5 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 space-y-4">
        {!visits ? <p className="border-y border-slate-200 bg-white p-10 text-center text-slate-500">Loading records…</p> : visits.length === 0 ? <p className="border-y border-slate-200 bg-white p-10 text-center text-slate-500">No medical records are available yet.</p> : visits.map((visit) => (
          <article key={visit.id} className="border-y border-slate-200 bg-white px-5 py-5 sm:border sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <time className="font-medium text-slate-900">{new Date(visit.visited_at).toLocaleDateString()}</time>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase text-slate-600">{visit.type}</span>
              </div>
              <span className="text-sm text-slate-500">{visit.doctor?.user?.name ?? "Care team"}</span>
            </div>
            {visit.chief_complaint && <p className="mt-3 text-sm text-slate-700"><b>Reason:</b> {visit.chief_complaint}</p>}
            {visit.diagnosis && <p className="mt-1 text-sm text-slate-700"><b>Diagnosis:</b> {visit.diagnosis}</p>}
            {visit.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600"><b>Notes:</b> {visit.notes}</p>}
            {visit.prescription && (
              <div className="mt-4 border-l-4 border-blue-500 bg-blue-50/70 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Prescription</h2>
                <ul className="mt-2 space-y-2">
                  {visit.prescription.items.map((item, index) => (
                    <li key={`${visit.id}-${index}`} className="text-sm text-slate-700">
                      <b>{item.medicine_name}</b> · {item.dosage} · {item.frequency}{item.duration_days ? ` for ${item.duration_days} days` : ""}{item.instructions ? ` · ${item.instructions}` : ""}
                    </li>
                  ))}
                </ul>
                {visit.prescription.notes && <p className="mt-2 text-xs text-slate-500">{visit.prescription.notes}</p>}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
