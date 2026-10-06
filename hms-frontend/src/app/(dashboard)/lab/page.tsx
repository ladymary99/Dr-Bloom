"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type LabTest = {
  id: number; test_name: string; status: string; result: string | null; notes: string | null;
  created_at: string; completed_at: string | null;
  patient: { mrn: string; first_name: string; last_name: string };
  doctor: { user: { name: string } } | null;
};

const pill: Record<string, string> = {
  ordered: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const TABS = ["", "ordered", "in_progress", "completed", "cancelled"] as const;

export default function LabPage() {
  const [tests, setTests] = useState<LabTest[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("");
  const [resultFor, setResultFor] = useState<LabTest | null>(null);
  const [viewResult, setViewResult] = useState<LabTest | null>(null);

  const load = useCallback(async (s: string) => {
    const { data } = await api.get("/lab-tests", { params: { status: s || undefined } });
    setTests(data);
  }, []);

  useEffect(() => { load(tab).catch(() => {}); }, [tab, load]);

  async function setStatus(t: LabTest, status: string, result?: string) {
    await api.put(`/lab-tests/${t.id}`, { status, ...(result !== undefined && { result }) });
    setResultFor(null);
    load(tab);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Laboratory</h1>
        <p className="mt-1 text-sm text-slate-500">{tests ? `${tests.length} tests in view` : "Loading…"} — ordered by doctors, newest first.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${tab === s ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {!tests ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : tests.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No tests in this view.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-6 py-3 font-medium">Test</th>
                <th className="px-6 py-3 font-medium">Patient</th>
                <th className="px-6 py-3 font-medium">Ordered by</th>
                <th className="px-6 py-3 font-medium">Ordered</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{t.test_name}</td>
                  <td className="px-6 py-3 text-slate-700">
                    {t.patient.first_name} {t.patient.last_name}
                    <div className="text-xs text-blue-700">{t.patient.mrn}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{t.doctor?.user?.name ?? "—"}</td>
                  <td className="px-6 py-3 tabular-nums text-slate-600">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${pill[t.status]}`}>{t.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-3">
                      {t.status === "ordered" && (
                        <button onClick={() => setStatus(t, "in_progress")} className="text-xs font-medium text-amber-700 hover:underline">
                          Start
                        </button>
                      )}
                      {t.status === "in_progress" && (
                        <button onClick={() => setResultFor(t)} className="text-xs font-medium text-blue-600 hover:underline">
                          Enter result
                        </button>
                      )}
                      {t.status === "completed" && (
                        <button onClick={() => setViewResult(t)} className="text-xs font-medium text-green-700 hover:underline">
                          View result
                        </button>
                      )}
                      {["ordered", "in_progress"].includes(t.status) && (
                        <button onClick={() => { if (confirm("Cancel this test?")) setStatus(t, "cancelled"); }} className="text-xs font-medium text-red-600 hover:underline">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resultFor && <ResultModal test={resultFor} onClose={() => setResultFor(null)} onSave={(r) => setStatus(resultFor, "completed", r)} />}
      {viewResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setViewResult(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-900">{viewResult.test_name} — Result</h2>
            <p className="mt-1 text-xs text-slate-500">
              {viewResult.patient.first_name} {viewResult.patient.last_name} · completed {viewResult.completed_at ? new Date(viewResult.completed_at).toLocaleString() : "—"}
            </p>
            <div className="mt-4 whitespace-pre-wrap rounded-xl bg-green-50 p-4 text-sm text-slate-800">{viewResult.result ?? "—"}</div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewResult(null)} className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultModal({ test, onClose, onSave }: { test: LabTest; onClose: () => void; onSave: (result: string) => void }) {
  const [result, setResult] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Result — {test.test_name}</h2>
        <p className="mt-1 text-xs text-slate-500">{test.patient.first_name} {test.patient.last_name} · {test.patient.mrn}</p>
        <textarea rows={6} autoFocus className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          placeholder="e.g. Hemoglobin: 13.5 g/dL (normal)&#10;WBC: 6.2 (normal)…"
          value={result} onChange={(e) => setResult(e.target.value)} />
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(result)} disabled={!result.trim()}
            className="rounded-full bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
            Complete test
          </button>
        </div>
      </div>
    </div>
  );
}