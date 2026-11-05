export type Code = { code: string; description: string };
export type RxItem = { id: number; medicine_name: string; dosage: string; frequency: string; duration_days: number | null; instructions: string | null };
export type Lab = { id: number; test_name: string; category: "lab" | "imaging"; status: string; result: string | null; is_critical: boolean; released_at: string | null; reviewed_at: string | null };
export type Letter = { id: string; type: "sick_note" | "referral"; issued_at: string };
export type Addendum = { id: number; body: string; author: string | null; created_at: string };

export type Form = {
  chief_complaint: string;
  vitals: Record<string, string>;
  subjective: string; objective: string; assessment: string; plan: string;
  diagnosis: string; diagnosis_codes: Code[];
  notes: string;
  follow_up_days: string; follow_up_note: string;
  share_diagnosis: boolean; share_vitals: boolean; share_notes: boolean;
};

export type Encounter = {
  visit: {
    id: string; patient_id: string; appointment_id: string | null; status: "draft" | "signed"; visited_at: string; signed_at: string | null; version: number;
    chief_complaint: string | null; vitals: Record<string, number | string> | null; subjective: string | null; objective: string | null;
    assessment: string | null; plan: string | null; diagnosis: string | null; diagnosis_codes: Code[] | null; notes: string | null;
    follow_up_days: number | null; follow_up_note: string | null; share_diagnosis: boolean; share_vitals: boolean; share_notes: boolean;
  };
  doctor: string | null;
  patient: { id: string; mrn: string; name: string; age: number | null; gender: string | null; blood_type: string | null; allergies: string | null; chronic_conditions: string | null; current_medications: string | null; emergency_contact_name: string | null };
  appointment: { id: string; appointment_at: string; reason: string | null; visit_type: string; duration_minutes: number } | null;
  prescription: { id: string; notes: string | null; items: RxItem[] } | null;
  lab_tests: Lab[]; letters: Letter[]; addenda: Addendum[];
  previous: { id: string; visited_at: string; doctor: string | null; diagnosis: string | null; codes: Code[] | null; vitals: Record<string, number | string> | null; chief_complaint: string | null }[];
  invoice: { id: number; invoice_number: string; amount: string; status: string } | null;
  can_edit?: boolean;
};

export const VITAL_FIELDS: { key: string; label: string; unit: string; step: string; min: number; max: number }[] = [
  { key: "bp_systolic", label: "BP systolic", unit: "mmHg", step: "1", min: 30, max: 300 },
  { key: "bp_diastolic", label: "BP diastolic", unit: "mmHg", step: "1", min: 20, max: 200 },
  { key: "pulse", label: "Pulse", unit: "bpm", step: "1", min: 20, max: 300 },
  { key: "temperature", label: "Temp", unit: "°C", step: "0.1", min: 30, max: 45 },
  { key: "spo2", label: "SpO₂", unit: "%", step: "1", min: 30, max: 100 },
  { key: "resp_rate", label: "Resp. rate", unit: "/min", step: "1", min: 3, max: 80 },
  { key: "weight", label: "Weight", unit: "kg", step: "0.1", min: 0.3, max: 500 },
  { key: "height", label: "Height", unit: "cm", step: "1", min: 20, max: 260 },
];

export function toForm(v: Encounter["visit"]): Form {
  const vit: Record<string, string> = {};
  Object.entries(v.vitals ?? {}).forEach(([k, val]) => { vit[k] = String(val); });
  return {
    chief_complaint: v.chief_complaint ?? "", vitals: vit, subjective: v.subjective ?? "", objective: v.objective ?? "", assessment: v.assessment ?? "", plan: v.plan ?? "",
    diagnosis: v.diagnosis ?? "", diagnosis_codes: v.diagnosis_codes ?? [], notes: v.notes ?? "",
    follow_up_days: v.follow_up_days ? String(v.follow_up_days) : "", follow_up_note: v.follow_up_note ?? "",
    share_diagnosis: v.share_diagnosis, share_vitals: v.share_vitals, share_notes: v.share_notes,
  };
}

export function toPayload(f: Form) {
  const vitals = Object.fromEntries(Object.entries(f.vitals).filter(([, v]) => v !== "" && !Number.isNaN(Number(v))).map(([k, v]) => [k, Number(v)]));
  return {
    chief_complaint: f.chief_complaint || null, vitals: Object.keys(vitals).length ? vitals : null,
    subjective: f.subjective || null, objective: f.objective || null, assessment: f.assessment || null, plan: f.plan || null,
    diagnosis: f.diagnosis || null, diagnosis_codes: f.diagnosis_codes, notes: f.notes || null,
    follow_up_days: f.follow_up_days ? Number(f.follow_up_days) : null, follow_up_note: f.follow_up_note || null,
    share_diagnosis: f.share_diagnosis, share_vitals: f.share_vitals, share_notes: f.share_notes,
  };
}
