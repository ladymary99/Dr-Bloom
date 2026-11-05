"use client";

import { fmtShortDate } from "@/lib/format";

export type VitalPoint = { at: string; bp_systolic: number | null; bp_diastolic: number | null; pulse: number | null; weight: number | null; temperature: number | null; spo2: number | null };

const SERIES: { key: keyof VitalPoint; label: string; unit: string; second?: keyof VitalPoint }[] = [
  { key: "bp_systolic", second: "bp_diastolic", label: "Blood pressure", unit: "mmHg" },
  { key: "pulse", label: "Pulse", unit: "bpm" },
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "spo2", label: "SpO₂", unit: "%" },
];

function Spark({ values, second }: { values: (number | null)[]; second?: (number | null)[] }) {
  const all = [...values, ...(second ?? [])].filter((v): v is number => v !== null);
  if (all.length < 2) return <div className="h-12 text-xs text-[var(--muted)]">Needs 2+ readings</div>;
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const W = 140, H = 44;
  const line = (arr: (number | null)[]) => arr.map((v, i) => (v === null ? null : `${(i / Math.max(arr.length - 1, 1)) * W},${H - 4 - ((v - lo) / span) * (H - 8)}`)).filter(Boolean).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full" role="img" aria-label={`Trend of ${values.filter((v) => v !== null).length} readings`}>
      <polyline fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={line(values)} />
      {second && <polyline fill="none" stroke="var(--muted)" strokeWidth="2" strokeDasharray="3 3" strokeLinejoin="round" points={line(second)} />}
    </svg>
  );
}

/** Small multiples of the main vitals across signed visits (oldest → newest). */
export default function VitalsTrend({ points }: { points: VitalPoint[] }) {
  if (points.length === 0) return <p className="text-sm text-[var(--muted)]">No vitals recorded in signed visits yet.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {SERIES.map((s) => {
        const vals = points.map((p) => p[s.key] as number | null);
        const sec = s.second ? points.map((p) => p[s.second!] as number | null) : undefined;
        const last = [...points].reverse().find((p) => p[s.key] !== null);
        if (!last) return null;
        return (
          <li key={s.label} className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-[var(--muted)]">{s.label}</p>
            <p className="font-heading text-lg font-semibold text-[var(--ink)]">{String(last[s.key])}{s.second && last[s.second] !== null ? `/${String(last[s.second])}` : ""} <span className="text-xs font-normal text-[var(--muted)]">{s.unit}</span></p>
            <Spark values={vals} second={sec} />
            <p className="text-[10px] text-[var(--muted)]">{fmtShortDate(points[0].at + "T00:00:00")} → {fmtShortDate(last.at + "T00:00:00")}</p>
          </li>
        );
      })}
    </ul>
  );
}
