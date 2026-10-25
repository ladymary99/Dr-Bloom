"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { fmtShortDate } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
import { ErrorState, ListSkeleton, btnGhost, btnPrimary, cardCls } from "@/components/ui";

type Rx = {
  id: string; status: string; issued_at: string; clinic: string; department: string | null; doctor: string | null; specialization: string | null;
  diagnosis: string | null; notes: string | null;
  patient: { name: string; mrn: string; date_of_birth: string | null; allergies: string | null };
  items: { id: number; medicine_name: string; dosage: string; frequency: string; duration_days: number | null; instructions: string | null }[];
};

/** Print-friendly prescription. "Print" → the browser's Save as PDF gives a downloadable PDF. */
export default function PrescriptionPrint() {
  const { id } = useParams<{ id: string }>();
  const { data: rx, error, reload } = useFetch<Rx>(`/portal/prescriptions/${id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap justify-between gap-2">
        <Link href="/portal/records" className={btnGhost}>← Back to records</Link>
        <button onClick={() => window.print()} className={btnPrimary}>Print / Save as PDF</button>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : !rx ? <ListSkeleton rows={2} /> : (
        <article className={`${cardCls} print-sheet p-8`}>
          <header className="flex items-start justify-between border-b-2 border-[var(--primary)] pb-4">
            <div>
              <h1 className="font-heading text-2xl font-bold text-[var(--primary)]">{rx.clinic}</h1>
              <p className="text-sm text-[var(--muted)]">{rx.department ?? "Prescription"}</p>
            </div>
            <div className="text-right text-sm"><p className="font-semibold">Dr. {rx.doctor}</p><p className="text-[var(--muted)]">{rx.specialization}</p><p className="text-[var(--muted)]">{fmtShortDate(rx.issued_at)}</p></div>
          </header>
          <section className="grid gap-2 border-b border-[var(--border)] py-4 text-sm sm:grid-cols-2">
            <p><span className="text-[var(--muted)]">Patient: </span><strong>{rx.patient.name}</strong></p>
            <p><span className="text-[var(--muted)]">MRN: </span><strong>{rx.patient.mrn}</strong></p>
            <p><span className="text-[var(--muted)]">Date of birth: </span>{rx.patient.date_of_birth ?? "—"}</p>
            <p><span className="text-[var(--muted)]">Allergies: </span>{rx.patient.allergies || "None recorded"}</p>
            {rx.diagnosis && <p className="sm:col-span-2"><span className="text-[var(--muted)]">Diagnosis: </span>{rx.diagnosis}</p>}
          </section>
          <section className="py-5">
            <h2 className="mb-3 font-heading text-lg font-semibold">℞ Medicines</h2>
            <ol className="space-y-3">
              {rx.items.map((i, n) => (
                <li key={i.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                  <p><strong>{n + 1}. {i.medicine_name}</strong> — {i.dosage}</p>
                  <p className="text-[var(--muted)]">{i.frequency}{i.duration_days ? ` · ${i.duration_days} days` : ""}</p>
                  {i.instructions && <p className="mt-1">{i.instructions}</p>}
                </li>
              ))}
            </ol>
            {rx.notes && <p className="mt-4 text-sm"><span className="font-semibold">Notes: </span>{rx.notes}</p>}
          </section>
          <footer className="border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">Prescription ID {rx.id}. Valid only when issued through the {rx.clinic} patient portal. Keep out of reach of children.</footer>
        </article>
      )}
    </div>
  );
}
