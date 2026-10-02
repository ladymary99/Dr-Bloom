"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Dept = { id: number; name: string };
type PatientRow = { id: string; mrn: string; first_name: string; last_name: string };

type Invoice = {
  id: number;
  invoice_number: string;
  description: string;
  amount: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  patient: { mrn: string; first_name: string; last_name: string } | null;
  department: { name: string; code: string } | null;
  creator: { name: string } | null;
};

type Paginated = { data: Invoice[]; current_page: number; last_page: number; total: number };

const statusPill: Record<string, string> = {
  paid: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  cancelled: "bg-red-50 text-red-600",
};

function money(v: string | number) {
  return "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PaymentsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [deptId, setDeptId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async (p: number, d: string, s: string) => {
    setLoading(true);
    const { data } = await api.get("/invoices", {
      params: { page: p, department_id: d || undefined, status: s || undefined },
    });
    setResult(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(page, deptId, status);
    api.get("/departments").then((r) => setDepartments(r.data)).catch(() => {});
  }, [page, deptId, status, load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
          <p className="mt-1 text-sm text-slate-500">{result ? `${result.total} invoices` : "Loading…"}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
          + Record payment
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select value={deptId} onChange={(e) => { setDeptId(e.target.value); setPage(1); }}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-600">
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm capitalize outline-none focus:border-blue-600">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : !result?.data.length ? (
          <div className="p-12 text-center text-slate-500">No invoices found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-6 py-4 font-medium">Invoice</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {result.data.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-blue-700">{inv.invoice_number}</div>
                    <div className="text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-900">
                    {inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : "—"}
                    <div className="text-xs text-slate-400">{inv.patient?.mrn}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{inv.department?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{inv.description}</td>
                  <td className="px-6 py-4 text-right font-medium tabular-nums text-slate-900">{money(inv.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusPill[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.status === "pending" && <MarkPaid id={inv.id} onDone={() => load(page, deptId, status)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {result && result.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <span className="text-sm text-slate-500">Page {result.current_page} of {result.last_page}</span>
            <div className="flex gap-2">
              <button disabled={result.current_page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">← Previous</button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <RecordPaymentModal
          departments={departments}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(1, deptId, status); setPage(1); }}
        />
      )}
    </div>
  );
}

/* Mark-as-paid inline action */
function MarkPaid({ id, onDone }: { id: number; onDone: () => void }) {
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    await api.put(`/invoices/${id}`, { status: "paid", payment_method: method });
    onDone();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <select value={method} onChange={(e) => setMethod(e.target.value)}
        className="rounded-full border border-slate-300 px-2 py-1 text-xs outline-none">
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="transfer">Transfer</option>
      </select>
      <button onClick={go} disabled={busy}
        className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60">
        {busy ? "…" : "Mark paid"}
      </button>
    </div>
  );
}

/* Record payment modal */
function RecordPaymentModal({ departments, onClose, onSaved }: { departments: Dept[]; onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<PatientRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("paid");
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  async function searchPatients() {
    if (!q.trim()) return;
    const { data } = await api.get("/patients", { params: { search: q } });
    setMatches(data.data.slice(0, 5));
  }

  async function submit() {
    setError("");
    if (!description.trim()) return setError("Description is required.");
    if (!amount || Number(amount) <= 0) return setError("Enter a valid amount.");
    setSaving(true);
    try {
      await api.post("/invoices", {
        patient_id: patient?.id ?? null,
        department_id: departmentId ? Number(departmentId) : null,
        description,
        amount: Number(amount),
        status,
        payment_method: status === "paid" ? method : null,
      });
      onSaved();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Record payment</h2>

        <div className="mt-5 space-y-4">
          {/* Patient search (optional) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Patient <span className="text-slate-400">(optional)</span></label>
            {patient ? (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 text-sm">
                <span><b>{patient.first_name} {patient.last_name}</b> <span className="text-blue-700">{patient.mrn}</span></span>
                <button onClick={() => setPatient(null)} className="text-slate-500 hover:text-red-600">✕</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchPatients())}
                    placeholder="Search name or MRN…" className={inputCls} />
                  <button onClick={searchPatients} className="rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200">Search</button>
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls}>
              <option value="">None</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description *</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Consultation fee" className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount *</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            {status === "paid" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            )}
          </div>

          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : "Record payment"}
          </button>
        </div>
      </div>
    </div>
  );
}