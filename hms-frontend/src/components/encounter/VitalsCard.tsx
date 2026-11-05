"use client";

import { Field, inputCls } from "@/components/ui";
import { VITAL_FIELDS } from "@/components/encounter/types";

export default function VitalsCard({ vitals, onChange, disabled }: { vitals: Record<string, string>; onChange: (v: Record<string, string>) => void; disabled?: boolean }) {
  const w = Number(vitals.weight), h = Number(vitals.height);
  const bmi = w > 0 && h > 0 ? w / Math.pow(h / 100, 2) : null;
  const bad = (k: string, min: number, max: number) => vitals[k] !== undefined && vitals[k] !== "" && (Number(vitals[k]) < min || Number(vitals[k]) > max);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VITAL_FIELDS.map((f) => (
          <Field key={f.key} label={`${f.label} (${f.unit})`} error={bad(f.key, f.min, f.max) ? `Expected ${f.min}–${f.max}` : undefined}>
            {(p) => <input {...p} type="number" inputMode="decimal" step={f.step} min={f.min} max={f.max} disabled={disabled} value={vitals[f.key] ?? ""}
              onChange={(e) => onChange({ ...vitals, [f.key]: e.target.value })} className={inputCls} />}
          </Field>
        ))}
      </div>
      {bmi !== null && isFinite(bmi) && <p className="mt-2 text-xs text-[var(--muted)]">BMI {bmi.toFixed(1)} kg/m² (calculated)</p>}
    </div>
  );
}
