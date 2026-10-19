"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type PatientRow = { id: string; mrn: string; first_name: string; last_name: string };
type Doctor = { id: number; user: { name: string }; specialization: string | null };

type BedInfo = {
  id: number; bed_number: string; status: "available" | "occupied" | "maintenance";
  patient: { id: string; mrn: string; first_name: string; last_name: string } | null;
  admission: { id: number; doctor: string | null; admitted_at: string; diagnosis: string | null } | null;
};

type WardInfo = {
  id: number; name: string; code: string;
  department: { name: string } | null;
  beds: BedInfo[];
};

type Inpatient = {
  id: number; admitted_at: string; diagnosis: string | null;
  patient: { mrn: string; first_name: string; last_name: string } | null;
  bed: { bed_number: string; ward: { name: string } };
  doctor: { user: { name: string } } | null;
};

const bedStyle: Record<string, string> = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-sm",
  occupied: "border-[var(--primary-tint)] bg-[var(--primary-tint)]/20 text-[var(--primary)] hover:-translate-y-0.5 hover:shadow-sm",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-sm",
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

const icons = {
  bed: <svg {...iconProps} className="h-5 w-5"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20M6 8v9"/></svg>,
  check: <svg {...iconProps} className="h-5 w-5"><path d="M20 6 9 17l-5-5"/></svg>,
  user: <svg {...iconProps} className="h-5 w-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  wrench: <svg {...iconProps} className="h-5 w-5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
};

export default function BedsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const roles = useAuthStore((s) => s.roles);
  const isDoctor = roles.includes("doctor") && !roles.includes("admin");
  const isNurse = roles.includes("nurse") && !roles.includes("admin");
  const canManageBeds = useAuthStore((s) => s.hasPermission("manage departments"));
  const canManageAdmissions = hasPermission("view patients");
  const canDischargeAdmissions = canManageAdmissions;
  const [wards, setWards] = useState<WardInfo[] | null>(null);
  const [inpatients, setInpatients] = useState<Inpatient[]>([]);
  const [modal, setModal] = useState<
    | { kind: "admit"; bed: BedInfo }
    | { kind: "occupied"; bed: BedInfo }
    | { kind: "maintenance"; bed: BedInfo }
    | { kind: "ward" }
    | { kind: "addBed"; ward: WardInfo }
    | null
  >(null);

  const load = useCallback(async () => {
    const [w, a] = await Promise.all([
      api.get("/wards"),
      api.get("/admissions", { params: { status: "admitted" } }),
    ]);
    setWards(w.data);
    setInpatients(a.data);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const beds = wards?.flatMap((w) => w.beds) ?? [];
  const occupied = beds.filter((b) => b.status === "occupied").length;
  const maintenance = beds.filter((b) => b.status === "maintenance").length;
  const available = beds.filter((b) => b.status === "available").length;
  const pct = beds.length ? Math.round((occupied / beds.length) * 100) : 0;

  async function setBedStatus(bed: BedInfo, status: "available" | "maintenance") {
    await api.put(`/beds/${bed.id}`, { status });
    setModal(null);
    load();
  }

  const kpis = [
    { label: "Occupancy", value: `${pct}%`, sub: `${occupied} of ${beds.length} beds`, icon: icons.bed, color: "var(--primary)", bar: pct, barColor: "bg-[var(--primary)]" },
    { label: "Available", value: available, sub: "ready to assign", icon: icons.check, color: "#059669", bar: beds.length ? (available / beds.length) * 100 : 0, barColor: "bg-emerald-500" },
    { label: "Occupied", value: occupied, sub: "currently in use", icon: icons.user, color: "var(--primary)", bar: pct, barColor: "bg-[var(--primary)]" },
    { label: "Maintenance", value: maintenance, sub: "out of service", icon: icons.wrench, color: "#d97706", bar: beds.length ? (maintenance / beds.length) * 100 : 0, barColor: "bg-amber-500" },
  ];

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Wards & Beds</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isDoctor || isNurse
              ? "View bed availability and assign beds to your patients."
              : "Click a bed to admit, discharge, or manage it."}
          </p>
        </div>
        {canManageBeds && (
          <button onClick={() => setModal({ kind: "ward" })}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
            + Add ward
          </button>
        )}
      </div>

      {/* KPI cards with mini bars */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((c) => (
          <div key={c.label} className={`${cardCls} !p-5`}>
            <div className="flex items-center justify-between">
              <span style={{ color: c.color }} aria-hidden>{c.icon}</span>
            </div>
            <div className="mt-3 font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">{c.value}</div>
            <div className="mt-0.5 text-xs text-[var(--muted)]">{c.sub ?? c.label}</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--primary-tint)]/15">
              <div className={`h-full rounded-full ${c.barColor} transition-all duration-700`} style={{ width: `${c.bar}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row: gauge + donut + ward bars */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Occupancy gauge */}
        <div className={`${cardCls} flex items-center gap-5`}>
          <GaugeRing pct={pct} />
          <div>
            <h3 className="font-heading font-semibold text-[var(--ink)]">Bed occupancy</h3>
            <div className="mt-1 font-heading text-3xl font-bold tabular-nums text-[var(--ink)]">{pct}%</div>
            <p className="mt-0.5 text-xs text-[var(--muted)]">{occupied} of {beds.length} beds occupied</p>
          </div>
        </div>

        {/* Status distribution donut */}
        <div className={`${cardCls} flex items-center gap-5`}>
          <StatusDonut available={available} occupied={occupied} maintenance={maintenance} />
          <div className="space-y-2 text-sm">
            <h3 className="font-heading font-semibold text-[var(--ink)]">Bed status</h3>
            {[
              { label: "Available", value: available, dot: "bg-emerald-500" },
              { label: "Occupied", value: occupied, dot: "bg-[var(--primary)]" },
              { label: "Maintenance", value: maintenance, dot: "bg-amber-500" },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${r.dot}`} />
                <span className="text-[var(--muted)]">{r.label}</span>
                <span className="ml-auto pl-4 font-semibold tabular-nums text-[var(--ink)]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ward occupancy bars */}
        <div className={cardCls}>
          <h3 className="font-heading font-semibold text-[var(--ink)]">Ward occupancy</h3>
          <div className="mt-4 space-y-3">
            {wards === null ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 animate-pulse rounded bg-[var(--primary-tint)]/15" />
              ))
            ) : wards.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--muted)]">No wards yet.</p>
            ) : (
              wards.map((w) => {
                const occ = w.beds.filter((b) => b.status === "occupied").length;
                const wPct = w.beds.length ? Math.round((occ / w.beds.length) * 100) : 0;
                return (
                  <div key={w.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--ink)]">{w.name}</span>
                      <span className="tabular-nums text-[var(--muted)]">{occ}/{w.beds.length}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--primary-tint)]/15">
                      <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-700" style={{ width: `${wPct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Ward cards */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {wards === null ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={`${cardCls} h-48 animate-pulse`} />
          ))
        ) : (
          wards.map((w) => {
            const occ = w.beds.filter((b) => b.status === "occupied").length;
            const wPct = w.beds.length ? Math.round((occ / w.beds.length) * 100) : 0;
            return (
              <div key={w.id} className={cardCls}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading font-semibold text-[var(--ink)]">{w.name}</h2>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      <span className="mr-2 font-mono">{w.code}</span>
                      {w.department?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-1 text-xs font-semibold tabular-nums text-[var(--primary)]">
                      {occ}/{w.beds.length} occupied
                    </span>
                    {canManageBeds && (
                      <button onClick={() => setModal({ kind: "addBed", ward: w })}
                        className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">
                        + Bed
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--primary-tint)]/15">
                  <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-700" style={{ width: `${wPct}%` }} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {w.beds.map((b) => (
                    <button
                      key={b.id}
                      disabled={b.status === "occupied"
                        ? !canManageBeds && !canManageAdmissions && !(isDoctor && !!b.admission)
                        : b.status === "maintenance"
                          ? !canManageBeds
                          : !canManageAdmissions}
                      onClick={() => {
                        if (b.status === "occupied") setModal({ kind: "occupied", bed: b });
                        else if (b.status === "maintenance" && canManageBeds) setModal({ kind: "maintenance", bed: b });
                        else if (b.status === "available" && canManageAdmissions) setModal({ kind: "admit", bed: b });
                      }}
                      className={`rounded-xl border p-3 text-left transition ${bedStyle[b.status]} disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-none`}
                    >
                      <div className="text-lg font-semibold tabular-nums">#{b.bed_number}</div>
                      <div className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide">
                        {b.status === "occupied" ? b.patient?.first_name ?? "Occupied" : b.status}
                      </div>
                    </button>
                  ))}
                  {w.beds.length === 0 && <div className="col-span-full py-4 text-center text-sm text-[var(--muted)]">{canManageBeds ? 'No beds yet — click "+ Bed".' : "No beds yet."}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Current inpatients */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        <div className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
          <h2 className="font-heading font-semibold text-[var(--ink)]">Current inpatients ({inpatients.length})</h2>
        </div>
        {inpatients.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <span className="text-[var(--primary)]" aria-hidden>{icons.bed}</span>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No admitted patients right now.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Bed</th>
                <th className="px-6 py-3">Doctor</th>
                <th className="px-6 py-3">Admitted</th>
                <th className="px-6 py-3">Diagnosis</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {inpatients.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10">
                  <td className="px-6 py-3">
                    <div className="font-medium text-[var(--ink)]">{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}</div>
                    <div className="text-xs font-medium text-[var(--primary)]">{a.patient?.mrn ?? "—"}</div>
                  </td>
                  <td className="px-6 py-3 text-[var(--muted)]">{a.bed.ward.name} · #{a.bed.bed_number}</td>
                  <td className="px-6 py-3 text-[var(--muted)]">{a.doctor?.user?.name ?? "—"}</td>
                  <td className="px-6 py-3 tabular-nums text-[var(--muted)]">{new Date(a.admitted_at).toLocaleString()}</td>
                  <td className="px-6 py-3 text-[var(--muted)]">{a.diagnosis ?? "—"}</td>
                  <td className="px-6 py-3 text-right">
                    {canDischargeAdmissions && (
                      <button
                        onClick={async () => { if (confirm("Discharge this patient? Bed becomes available.")) { await api.put(`/admissions/${a.id}/discharge`); load(); } }}
                        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700">
                        Discharge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {modal?.kind === "admit" && (
        <AdmitModal bed={modal.bed} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {modal?.kind === "occupied" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Bed #{modal.bed.bed_number} — Occupied</h2>
            <div className="mt-4 space-y-2 rounded-2xl bg-[var(--primary-tint)]/10 p-4 text-sm text-[var(--muted)]">
              <div><b className="text-[var(--ink)]">{modal.bed.patient?.first_name} {modal.bed.patient?.last_name}</b> <span className="font-medium text-[var(--primary)]">{modal.bed.patient?.mrn}</span></div>
              <div>Doctor: {modal.bed.admission?.doctor ?? "—"}</div>
              <div>Admitted: {modal.bed.admission ? new Date(modal.bed.admission.admitted_at).toLocaleString() : "—"}</div>
              {modal.bed.admission?.diagnosis && <div>Diagnosis: {modal.bed.admission.diagnosis}</div>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Close</button>
              {canDischargeAdmissions && (
                <button
                  onClick={async () => { if (confirm("Discharge this patient?")) { await api.put(`/admissions/${modal.bed.admission!.id}/discharge`); setModal(null); load(); } }}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700">
                  Discharge
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {modal?.kind === "maintenance" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Bed #{modal.bed.bed_number} — Maintenance</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">This bed is under maintenance and cannot be assigned.</p>
            <div className="mt-6 flex justify-end">
              {canManageBeds && (
                <button onClick={() => setBedStatus(modal.bed, "available")}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700">
                  Mark available
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {modal?.kind === "ward" && (
        <WardModal onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
      {modal?.kind === "addBed" && (
        <AddBedModal ward={modal.ward} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}

/* ---------- Occupancy gauge (pure SVG) ---------- */
function GaugeRing({ pct }: { pct: number }) {
  const SEGMENTS = 40;
  const filled = Math.round((pct / 100) * SEGMENTS);
  return (
    <div className="relative h-28 w-28 flex-none">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <line
            key={i}
            x1="60" y1="9"
            x2="60" y2={i < filled ? "27" : "25"}
            stroke={i < filled ? "var(--primary)" : "var(--border)"}
            strokeWidth="5.5"
            strokeLinecap="round"
            transform={`rotate(${(i / SEGMENTS) * 360} 60 60)`}
            className="transition-all duration-500"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-xl font-bold tabular-nums text-[var(--ink)]">{pct}%</span>
      </div>
    </div>
  );
}

/* ---------- Bed status donut (pure SVG) ---------- */
function StatusDonut({ available, occupied, maintenance }: { available: number; occupied: number; maintenance: number }) {
  const total = available + occupied + maintenance || 1;
  const R = 30, C = 2 * Math.PI * R;
  const segs = [
    { v: occupied, color: "var(--primary)" },
    { v: available, color: "#10b981" },
    { v: maintenance, color: "#f59e0b" },
  ];
  let offset = 0;

  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 flex-none -rotate-90">
      <circle cx="40" cy="40" r={R} fill="none" stroke="var(--border)" strokeWidth="10" opacity="0.4" />
      {segs.map((s, i) => {
        const frac = s.v / total;
        const el = (
          <circle
            key={i}
            cx="40" cy="40" r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="10"
            strokeDasharray={`${Math.max(frac * C - 2, 0)} ${C}`}
            strokeDashoffset={-offset * C}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        );
        offset += frac;
        return el;
      })}
    </svg>
  );
}

/* ---------- Admit modal ---------- */

function AdmitModal({ bed, onClose, onDone }: { bed: BedInfo; onClose: () => void; onDone: () => void }) {
  const roles = useAuthStore((s) => s.roles);
  const isDoctor = roles.includes("doctor") && !roles.includes("admin");
  const isNurse = roles.includes("nurse") && !roles.includes("admin");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<PatientRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

  useEffect(() => {
    api.get("/lookups/doctors").then((r) => setDoctors(r.data));
  }, []);

  async function search() {
    if (!q.trim()) return;
    const { data } = await api.get("/patients", { params: { search: q } });
    setMatches(data.data.slice(0, 5));
  }

  async function submit() {
    if (!patient) return setError("Select a patient.");
    if (isNurse && !doctorId) return setError("Select the doctor already associated with this patient.");
    setError("");
    setSaving(true);
    try {
      await api.post("/admissions", {
        patient_id: patient.id,
        bed_id: bed.id,
        doctor_id: doctorId ? Number(doctorId) : null,
        diagnosis: diagnosis || null,
        notes: notes || null,
      });
      onDone();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Could not admit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Admit patient — Bed #{bed.bed_number}</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Patient *</label>
            {patient ? (
              <div className="flex items-center justify-between rounded-xl bg-[var(--primary-tint)]/15 px-4 py-2.5 text-sm">
                <span className="text-[var(--ink)]"><b>{patient.first_name} {patient.last_name}</b> <span className="font-medium text-[var(--primary)]">{patient.mrn}</span></span>
                <button onClick={() => setPatient(null)} className="text-[var(--muted)] transition hover:text-red-600">✕</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
                    placeholder="Search name or MRN…" className={inputCls} />
                  <button onClick={search} className="rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">Search</button>
                </div>
                {matches.length > 0 && (
                  <ul className="mt-2 divide-y divide-[var(--border)]/60 overflow-hidden rounded-xl border border-[var(--border)]">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <button onClick={() => { setPatient(m); setMatches([]); }} className="w-full px-4 py-2.5 text-left text-sm transition hover:bg-[var(--primary-tint)]/10">
                          <span className="font-medium text-[var(--ink)]">{m.first_name} {m.last_name}</span>{" "}
                          <span className="text-[var(--primary)]">{m.mrn}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {!isDoctor && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">
                Attending doctor{isNurse ? " *" : ""}
              </label>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls}>
                <option value="">{isNurse ? "Select a doctor" : "None"}</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.user.name}</option>)}
              </select>
              {isNurse && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Select a doctor with an existing appointment or visit for this patient.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Diagnosis</label>
            <textarea rows={2} className={inputCls} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Notes</label>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
            {saving ? "Admitting…" : "Admit patient"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Ward & bed creation modals ---------- */

function WardModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", code: "", department_id: "" });
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

  useEffect(() => {
    api.get("/departments").then((r) => setDepartments(r.data)).catch(() => {});
  }, []);

  async function submit() {
    setError("");
    setSaving(true);
    try {
      await api.post("/wards", {
        name: form.name,
        code: form.code.toUpperCase(),
        department_id: form.department_id ? Number(form.department_id) : null,
      });
      onDone();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Could not create ward.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Add ward</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maternity Ward" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Code *</label>
            <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MAT-W" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Department</label>
            <select className={inputCls} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name || !form.code}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
            {saving ? "Creating…" : "Create ward"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBedModal({ ward, onClose, onDone }: { ward: WardInfo; onClose: () => void; onDone: () => void }) {
  const [bedNumber, setBedNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError("");
    setSaving(true);
    try {
      await api.post(`/wards/${ward.id}/beds`, { bed_number: bedNumber });
      onDone();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Could not add bed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Add bed — {ward.name}</h2>
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Bed number *</label>
          <input className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30"
            value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} placeholder="e.g. 6" />
        </div>
        {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button onClick={submit} disabled={saving || !bedNumber.trim()}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
            {saving ? "Adding…" : "Add bed"}
          </button>
        </div>
      </div>
    </div>
  );
}