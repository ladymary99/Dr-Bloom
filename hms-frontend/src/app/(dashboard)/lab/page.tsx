"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type LabTest = {
  id: number; test_name: string; status: string; result: string | null; notes: string | null;
  created_at: string; completed_at: string | null;
  patient: { mrn: string; first_name: string; last_name: string };
  doctor: { user: { name: string } } | null;
};

const pill: Record<string, string> = {
  ordered: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const TABS = ["", "ordered", "in_progress", "completed", "cancelled"] as const;

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

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
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Laboratory</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{tests ? `${tests.length} tests in view` : "Loading…"} — ordered by doctors, newest first.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${tab === s ? "bg-[var(--primary)] text-white shadow-sm" : "border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--primary-tint)] hover:text-[var(--primary)]"}`}>
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        {!tests ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-3">Test</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Ordered by</th>
                <th className="px-6 py-3">Ordered</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]/60 last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 animate-pulse rounded bg-[var(--primary-tint)]/20" style={{ width: `${50 + ((i * 9 + j * 13) % 40)}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : tests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><path d="M9 3h6M10 3v6.34L4.62 18.5A2 2 0 0 0 6.41 21h11.18a2 2 0 0 0 1.79-2.5L14 9.34V3"/><path d="M7 15h10"/></svg>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No tests in this view.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-3">Test</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Ordered by</th>
                <th className="px-6 py-3">Ordered</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10">
                  <td className="px-6 py-3 font-medium text-[var(--ink)]">{t.test_name}</td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-[var(--ink)]">{t.patient.first_name} {t.patient.last_name}</div>
                    <div className="text-xs font-medium text-[var(--primary)]">{t.patient.mrn}</div>
                  </td>
                  <td className="px-6 py-3 text-[var(--muted)]">{t.doctor?.user?.name ?? "—"}</td>
                  <td className="px-6 py-3 tabular-nums text-[var(--muted)]">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${pill[t.status]}`}>{t.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-3">
                      {t.status === "ordered" && (
                        <button onClick={() => setStatus(t, "in_progress")} className="text-xs font-medium text-amber-700 transition hover:underline">
                          Start
                        </button>
                      )}
                      {t.status === "in_progress" && (
                        <button onClick={() => setResultFor(t)} className="text-xs font-medium text-[var(--primary)] transition hover:underline">
                          Enter result
                        </button>
                      )}
                      {t.status === "completed" && (
                        <button onClick={() => setViewResult(t)} className="text-xs font-medium text-emerald-700 transition hover:underline">
                          View result
                        </button>
                      )}
                      {["ordered", "in_progress"].includes(t.status) && (
                        <button onClick={() => { if (confirm("Cancel this test?")) setStatus(t, "cancelled"); }} className="text-xs font-medium text-red-600 transition hover:underline">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={() => setViewResult(null)}>
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">{viewResult.test_name} — Result</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {viewResult.patient.first_name} {viewResult.patient.last_name} · completed {viewResult.completed_at ? new Date(viewResult.completed_at).toLocaleString() : "—"}
            </p>
            <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-emerald-50 p-4 text-sm text-[var(--ink)]">{viewResult.result ?? "—"}</div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setViewResult(null)} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Close</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Result — {test.test_name}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">{test.patient.first_name} {test.patient.last_name} · {test.patient.mrn}</p>
        <textarea rows={6} autoFocus
          className="mt-4 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30"
          placeholder={"e.g. Hemoglobin: 13.5 g/dL (normal)\nWBC: 6.2 (normal)…"}
          value={result} onChange={(e) => setResult(e.target.value)} />
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button onClick={() => onSave(result)} disabled={!result.trim()}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
            Complete test
          </button>
        </div>
      </div>
    </div>
  );
}