"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Patient = {
  id: string; mrn: string; first_name: string; last_name: string;
  date_of_birth: string; gender: string; blood_type: string | null; allergies: string | null;
};

type HistoryVisit = {
  id: string; visited_at: string; diagnosis: string | null; chief_complaint: string | null;
  doctor: { user: { name: string } };
  prescription: { items: { medicine_name: string; dosage: string; frequency: string }[] } | null;
};

type Item = { medicine_name: string; dosage: string; frequency: string; duration_days: string; instructions: string };

const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const ageReferenceDate = new Date();

export default function ConsultPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<HistoryVisit[]>([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    chief_complaint: "", bp: "", temp: "", pulse: "", spo2: "",
    diagnosis: "", notes: "", type: "opd",
  });
  const [visitId, setVisitId] = useState<string | null>(null);
  // what the patient may see in their portal (notes stay private unless the doctor opts in)
  const [share, setShare] = useState({ diagnosis: true, vitals: true, notes: false });
  const [testCategory, setTestCategory] = useState<"lab" | "imaging">("lab");
  const [testName, setTestName] = useState("");
  const [orderedTests, setOrderedTests] = useState<string[]>([]);
  const [orderingTest, setOrderingTest] = useState(false);
  const [items, setItems] = useState<Item[]>([
    { medicine_name: "", dosage: "", frequency: "", duration_days: "", instructions: "" },
  ]);
  const [rxNotes, setRxNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [rxDone, setRxDone] = useState(false);

  useEffect(() => {
    api.get(`/appointments/${appointmentId}`).then((r) => {
      setPatient(r.data.patient);
      return api.get(`/patients/${r.data.patient.id}/history`);
    }).then((r) => setHistory(r.data)).catch(() => setError("Could not load appointment."));
  }, [appointmentId]);

  async function saveVisit() {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/visits", {
        patient_id: patient?.id,
        appointment_id: appointmentId,
        chief_complaint: form.chief_complaint || null,
        vitals: {
          ...(form.bp && { bp: form.bp }),
          ...(form.temp && { temp: form.temp }),
          ...(form.pulse && { pulse: form.pulse }),
          ...(form.spo2 && { spo2: form.spo2 }),
        },
        diagnosis: form.diagnosis || null,
        notes: form.notes || null,
        type: form.type,
        share_diagnosis: share.diagnosis,
        share_vitals: share.vitals,
        share_notes: share.notes,
      });
      setVisitId(data.id);
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? "Could not save visit.");
    } finally {
      setSaving(false);
    }
  }

  async function savePrescription() {
    const valid = items.filter((i) => i.medicine_name.trim() && i.dosage.trim() && i.frequency.trim());
    if (!valid.length) return setError("Add at least one complete medicine row.");
    setSaving(true);
    setError("");
    try {
      await api.post(`/visits/${visitId}/prescriptions`, {
        notes: rxNotes || null,
        items: valid.map((i) => ({
          ...i,
          duration_days: i.duration_days ? Number(i.duration_days) : null,
        })),
      });
      setRxDone(true);
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? "Could not save prescription.");
    } finally {
      setSaving(false);
    }
  }

  async function orderTest() {
    const name = testName.trim();
    if (!name || !visitId || !patient || orderingTest) return;

    setOrderingTest(true);
    setError("");
    try {
      await api.post("/lab-tests", {
        patient_id: patient.id,
        visit_id: visitId,
        test_name: name,
        category: testCategory,
      });
      setOrderedTests((tests) => [...tests, name]);
      setTestName("");
    } catch (requestError) {
      const message = (requestError as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message ?? "Could not send the test to the laboratory.");
    } finally {
      setOrderingTest(false);
    }
  }

  function setItem(idx: number, field: keyof Item, value: string) {
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  if (error && !patient) return <div className="rounded-2xl border border-red-200 bg-white p-12 text-center text-red-600">{error}</div>;
  if (!patient) return <div className="p-12 text-center text-slate-500">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
            {patient.first_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-sm text-slate-500">
              <span className="mr-2 text-blue-700">{patient.mrn}</span>
              {Math.floor((ageReferenceDate.getTime() - new Date(patient.date_of_birth).getTime()) / 3.15576e10)}y · {patient.gender}
              {patient.blood_type && <> · <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700">{patient.blood_type}</span></>}
              {patient.allergies && <span className="ml-2 text-red-600">⚠ Allergies: {patient.allergies}</span>}
            </p>
          </div>
        </div>
        <button onClick={() => router.push("/doctor/queue")} className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          ← Back to queue
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Consultation form */}
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Consultation</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Chief complaint</label>
                <textarea rows={2} className={inputCls} value={form.chief_complaint}
                  onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {([["bp", "BP (120/80)"], ["temp", "Temp °C"], ["pulse", "Pulse"], ["spo2", "SpO₂ %"]] as const).map(([f, ph]) => (
                  <div key={f}>
                    <label className="mb-1 block text-sm font-medium capitalize text-slate-700">{f === "spo2" ? "SpO₂" : f}</label>
                    <input className={inputCls} placeholder={ph} value={form[f]}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Diagnosis</label>
                <textarea rows={2} className={inputCls} value={form.diagnosis}
                  onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Visit type</label>
                  <select className={inputCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="opd">OPD</option>
                    <option value="ipd">IPD</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                  <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              {!visitId && (
                <fieldset className="mt-4 rounded-2xl border border-[var(--border)] bg-slate-50 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-800">Visible to the patient in their portal</legend>
                  <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-800">
                    {([["diagnosis", "Diagnosis"], ["vitals", "Vitals"], ["notes", "My notes"]] as const).map(([k, label]) => (
                      <label key={k} className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={share[k]} onChange={(e) => setShare({ ...share, [k]: e.target.checked })} className="h-4 w-4" />
                        {label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">The reason for visit and prescriptions are always visible. You can change this later from the patient&apos;s history.</p>
                </fieldset>
              )}

              {!visitId && (
                <button onClick={saveVisit} disabled={saving}
                  className="w-full rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? "Saving visit…" : "Save visit & continue to prescription"}
                </button>
              )}
              {visitId && <div className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">✓ Visit saved — appointment marked completed.</div>}
            </div>
          </div>

          {/* Prescription */}
          {visitId && !rxDone && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">e-Prescription</h2>
                <button
                  onClick={() => setItems([...items, { medicine_name: "", dosage: "", frequency: "", duration_days: "", instructions: "" }])}
                  className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  + Add medicine
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 p-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <input className={inputCls} placeholder="Medicine *" value={item.medicine_name}
                        onChange={(e) => setItem(idx, "medicine_name", e.target.value)} />
                      <input className={inputCls} placeholder="Dosage * (500mg)" value={item.dosage}
                        onChange={(e) => setItem(idx, "dosage", e.target.value)} />
                      <input className={inputCls} placeholder="Frequency * (1x3)" value={item.frequency}
                        onChange={(e) => setItem(idx, "frequency", e.target.value)} />
                      <div className="flex gap-2">
                        <input type="number" min="1" className={inputCls} placeholder="Days" value={item.duration_days}
                          onChange={(e) => setItem(idx, "duration_days", e.target.value)} />
                        {items.length > 1 && (
                          <button onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            className="flex-none text-slate-400 hover:text-red-600">✕</button>
                        )}
                      </div>
                    </div>
                    <input className={`mt-3 ${inputCls}`} placeholder="Instructions (e.g. after meals)" value={item.instructions}
                      onChange={(e) => setItem(idx, "instructions", e.target.value)} />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <input className={inputCls} placeholder="Prescription notes" value={rxNotes} onChange={(e) => setRxNotes(e.target.value)} />
              </div>

              <button onClick={savePrescription} disabled={saving}
                className="mt-4 w-full rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? "Saving…" : "Save prescription"}
              </button>
            </div>
          )}

          {visitId && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-semibold text-slate-900">Lab tests</h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="test-category" className="sr-only">Category</label>
                <select id="test-category" value={testCategory} onChange={(e) => setTestCategory(e.target.value as "lab" | "imaging")} className={`${inputCls} !w-36 flex-none`}>
                  <option value="lab">Laboratory</option>
                  <option value="imaging">Imaging</option>
                </select>
                <input className={inputCls} placeholder="Test name (e.g. CBC, X-Ray Chest)" value={testName}
                  onChange={(event) => setTestName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void orderTest();
                    }
                  }} />
                <button type="button" onClick={orderTest} disabled={!testName.trim() || orderingTest}
                  className="rounded-full bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">
                  {orderingTest ? "Sending…" : "Order test"}
                </button>
              </div>
              {orderedTests.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {orderedTests.map((test, index) => (
                    <li key={`${test}-${index}`} className="text-sm text-slate-600">{test} · Sent to laboratory</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {rxDone && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
              <div className="text-lg font-semibold text-green-800">✓ Consultation complete</div>
              <p className="mt-1 text-sm text-green-700">Visit and prescription saved to the patient chart.</p>
              <button onClick={() => router.push("/doctor/queue")}
                className="mt-4 rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Back to queue
              </button>
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        {/* History sidebar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Previous visits ({history.length})</h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No previous visits.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {history.map((v) => (
                <li key={v.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="text-xs text-slate-400">{new Date(v.visited_at).toLocaleDateString()} · {v.doctor.user.name}</div>
                  {v.chief_complaint && <div className="mt-1 text-sm text-slate-700">{v.chief_complaint}</div>}
                  {v.diagnosis && <div className="mt-1 text-sm font-medium text-slate-900">Dx: {v.diagnosis}</div>}
                  {v.prescription && (
                    <ul className="mt-2 space-y-1">
                      {v.prescription.items.map((it, i) => (
                        <li key={i} className="text-xs text-slate-600">
                          • {it.medicine_name} {it.dosage} — {it.frequency}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}