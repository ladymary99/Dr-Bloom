"use client";

import { fmtShortDate } from "@/lib/format";
import { cardCls } from "@/components/ui";

export type LetterData = {
  id: string; type: "sick_note" | "referral"; issued_at: string; clinic: string; doctor: string | null; specialization: string | null;
  license_number: string | null; department: string | null; diagnosis: string | null;
  patient: { name: string; mrn: string; date_of_birth: string | null };
  data: { from_date?: string; to_date?: string; note?: string; to_specialty?: string; to_doctor?: string; urgency?: string; reason?: string };
};

/** Printable sick note / referral letter. Used by the doctor and by the patient portal. */
export default function LetterSheet({ l }: { l: LetterData }) {
  const days = l.data.from_date && l.data.to_date ? Math.round((new Date(l.data.to_date).getTime() - new Date(l.data.from_date).getTime()) / 86_400_000) + 1 : null;
  return (
    <article className={`${cardCls} print-sheet p-8`}>
      <header className="flex items-start justify-between border-b-2 border-[var(--primary)] pb-4">
        <div><h1 className="font-heading text-2xl font-bold text-[var(--primary)]">{l.clinic}</h1><p className="text-sm text-[var(--muted)]">{l.department ?? ""}</p></div>
        <p className="text-sm text-[var(--muted)]">{fmtShortDate(l.issued_at)}</p>
      </header>

      <h2 className="mt-6 font-heading text-xl font-semibold">{l.type === "sick_note" ? "Medical certificate (sick note)" : "Referral letter"}</h2>
      <p className="mt-3 text-sm"><span className="text-[var(--muted)]">Patient: </span><b>{l.patient.name}</b> · MRN {l.patient.mrn}{l.patient.date_of_birth ? ` · born ${l.patient.date_of_birth}` : ""}</p>

      {l.type === "sick_note" ? (
        <div className="mt-5 space-y-3 text-sm leading-relaxed">
          <p>This is to certify that the patient named above was examined and is <b>unfit for work</b> from <b>{fmtShortDate(l.data.from_date)}</b> to <b>{fmtShortDate(l.data.to_date)}</b> inclusive{days ? ` (${days} day${days > 1 ? "s" : ""})` : ""}.</p>
          {l.diagnosis && <p><span className="text-[var(--muted)]">Diagnosis: </span>{l.diagnosis}</p>}
          {l.data.note && <p className="whitespace-pre-wrap">{l.data.note}</p>}
        </div>
      ) : (
        <div className="mt-5 space-y-3 text-sm leading-relaxed">
          <p>To: <b>{l.data.to_doctor ? `Dr. ${l.data.to_doctor}, ` : ""}{l.data.to_specialty}</b> <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${l.data.urgency === "routine" ? "bg-slate-200 text-slate-800" : "bg-red-100 text-red-800"}`}>{l.data.urgency}</span></p>
          <p>Dear colleague, I would be grateful if you could see the patient named above.</p>
          <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3">{l.data.reason}</p>
          {l.diagnosis && <p><span className="text-[var(--muted)]">Working diagnosis: </span>{l.diagnosis}</p>}
        </div>
      )}

      <footer className="mt-12 flex items-end justify-between text-sm">
        <div><p className="font-semibold">Dr. {l.doctor}</p><p className="text-[var(--muted)]">{l.specialization}</p>{l.license_number && <p className="text-[var(--muted)]">Licence {l.license_number}</p>}</div>
        <span className="w-52 border-t border-slate-400 pt-1 text-center text-xs text-[var(--muted)]">Signature / stamp</span>
      </footer>
    </article>
  );
}
