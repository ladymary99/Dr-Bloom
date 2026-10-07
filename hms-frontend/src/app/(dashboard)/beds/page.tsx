"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

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
  patient: { mrn: string; first_name: string; last_name: string };
  bed: { bed_number: string; ward: { name: string } };
  doctor: { user: { name: string } } | null;
};

const bedStyle: Record<string, string> = {
  available: "border-green-200 bg-green-50 text-green-700 hover:border-green-400",
  occupied: "border-blue-200 bg-blue-50 text-blue-700",
  maintenance: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400",
};

export default function BedsPage() {
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Wards & Beds</h1>
          <p className="mt-1 text-sm text-slate-500">Click a bed to admit, discharge, or manage it.</p>
        </div>
        <button onClick={() => setModal({ kind: "ward" })}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Add ward
        </button>
      </div>

      {/* Occupancy strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Occupancy", value: `${pct}%`, sub: `${occupied} of ${beds.length} beds`, icon: "🛏️" },
          { label: "Available", value: available, icon: "🟢" },
          { label: "Occupied", value: occupied, icon: "🔵" },
          { label: "Maintenance", value: maintenance, icon: "🟠" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xl" aria-hidden>{c.icon}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{c.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{c.sub ?? c.label}</div>
          </div>
        ))}
      </div>

      {/* Ward cards */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {wards?.map((w) => {
          const occ = w.beds.filter((b) => b.status === "occupied").length;
          return (
            <div key={w.id} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">{w.name}</h2>
                  <p className="text-xs text-slate-500">
                    <span className="mr-2 font-mono">{w.code}</span>
                    {w.department?.name} · {occ}/{w.beds.length} occupied
                  </p>
                </div>
                <button onClick={() => setModal({ kind: "addBed", ward: w })}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  + Bed
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {w.beds.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setModal(b.status === "occupied" ? { kind: "occupied", bed: b } : b.status === "maintenance" ? { kind: "maintenance", bed: b } : { kind: "admit", bed: b })}
                    className={`rounded-xl border p-3 text-left transition ${bedStyle[b.status]}`}
                  >
                    <div className="text-lg font-semibold">#{b.bed_number}</div>
                    <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide">
                      {b.status === "occupied" ? b.patient?.first_name ?? "Occupied" : b.status}
                    </div>
                  </button>
                ))}
                {w.beds.length === 0 && <div className="col-span-full py-4 text-center text-sm text-slate-400">No beds yet — click &quot;+ Bed&quot;.</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current inpatients */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Current inpatients ({inpatients.length})</h2>
        </div>
        {inpatients.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No admitted patients right now.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Bed</th>
                <th className="px-6 py-3 font-medium">Doctor</th>
                <th className="px-6 py-3 font-medium">Admitted</th>
                <th className="px-6 py-3 font-medium">Diagnosis</th>
                <th className="px-6 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {inpatients.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 py-3 text-slate-900">
                    {a.patient.first_name} {a.patient.last_name}
                    <div className="text-xs text-blue-700">{a.patient.mrn}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{a.bed.ward.name} · #{a.bed.bed_number}</td>
                  <td className="px-6 py-3 text-slate-600">{a.doctor?.user?.name ?? "—"}</td>
                  <td className="px-6 py-3 tabular-nums text-slate-600">{new Date(a.admitted_at).toLocaleString()}</td>
                  <td className="px-6 py-3 text-slate-600">{a.diagnosis ?? "—"}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={async () => { if (confirm("Discharge this patient? Bed becomes available.")) { await api.put(`/admissions/${a.id}/discharge`); load(); } }}
                      className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700">
                      Discharge
                    </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Bed #{modal.bed.bed_number} — Occupied</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div><b className="text-slate-900">{modal.bed.patient?.first_name} {modal.bed.patient?.last_name}</b> <span className="text-blue-700">{modal.bed.patient?.mrn}</span></div>
              <div>Doctor: {modal.bed.admission?.doctor ?? "—"}</div>
              <div>Admitted: {modal.bed.admission ? new Date(modal.bed.admission.admitted_at).toLocaleString() : "—"}</div>
              {modal.bed.admission?.diagnosis && <div>Diagnosis: {modal.bed.admission.diagnosis}</div>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">Close</button>
              <button
                onClick={async () => { if (confirm("Discharge this patient?")) { await api.put(`/admissions/${modal.bed.admission!.id}/discharge`); setModal(null); load(); } }}
                className="rounded-full bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700">
                Discharge
              </button>
            </div>
          </div>
        </div>
      )}
      {modal?.kind === "maintenance" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">Bed #{modal.bed.bed_number} — Maintenance</h2>
            <p className="mt-2 text-sm text-slate-500">This bed is under maintenance and cannot be assigned.</p>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setBedStatus(modal.bed, "available")}
                className="rounded-full bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700">
                Mark available
              </button>
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

/* ---------- Admit modal ---------- */

function AdmitModal({ bed, onClose, onDone }: { bed: BedInfo; onClose: () => void; onDone: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<PatientRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Admit patient — Bed #{bed.bed_number}</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patient *</label>
            {patient ? (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 text-sm">
                <span><b>{patient.first_name} {patient.last_name}</b> <span className="text-blue-700">{patient.mrn}</span></span>
                <button onClick={() => setPatient(null)} className="text-slate-500 hover:text-red-600">✕</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
                    placeholder="Search name or MRN…" className={inputCls} />
                  <button onClick={search} className="rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200">Search</button>
                </div>
                {matches.length > 0 && (
                  <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <button onClick={() => { setPatient(m); setMatches([]); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                          {m.first_name} {m.last_name} <span className="text-blue-700">{m.mrn}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Attending doctor</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls}>
              <option value="">None</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.user.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Diagnosis</label>
            <textarea rows={2} className={inputCls} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
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
  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Add ward</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Maternity Ward" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Code *</label>
            <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MAT-W" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <select className={inputCls} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving || !form.name || !form.code}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Add bed — {ward.name}</h2>
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Bed number *</label>
          <input className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            value={bedNumber} onChange={(e) => setBedNumber(e.target.value)} placeholder="e.g. 6" />
        </div>
        {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving || !bedNumber.trim()}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Adding…" : "Add bed"}
          </button>
        </div>
      </div>
    </div>
  );
}