"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Dept = { id: number; name: string };
type Doctor = { id: number; specialization: string | null; user: { name: string } };
type PatientRow = { id: string; mrn: string; first_name: string; last_name: string };

type Invoice = {
  id: number;
  invoice_number: string;
  description: string;
  amount: string;
  status: string;
  payment_method: string | null;
  source: string;
  created_at: string;
  patient: { mrn: string; first_name: string; last_name: string } | null;
  doctor: { user: { name: string } } | null;
  department: { name: string; code: string } | null;
  creator: { name: string } | null;
};

type Paginated = { data: Invoice[]; current_page: number; last_page: number; total: number };

type Summary = {
  revenue_total: number; revenue_today: number; revenue_week: number; revenue_month: number;
  pending_count: number; pending_sum: number;
  by_source: { online: number; reception: number };
  weekly: { label: string; total: number }[];
  monthly: { label: string; total: number }[];
};

const statusPill: Record<string, string> = {
  paid: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  cancelled: "bg-red-50 text-red-600",
};

const money = (v: number | string) =>
  "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PaymentsPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
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

  const loadSummary = useCallback(async () => {
    const { data } = await api.get("/admin/finance/summary");
    setSummary(data);
  }, []);

  useEffect(() => {
    load(page, deptId, status);
    loadSummary();
    api.get("/departments").then((r) => setDepartments(r.data)).catch(() => {});
  }, [page, deptId, status, load, loadSummary]);

  async function exportCsv() {
    const res = await api.get("/admin/finance/export", {
      responseType: "blob",
      params: { department_id: deptId || undefined },
    });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `income-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Income & Payments</h1>
          <p className="mt-1 text-sm text-slate-500">
            {result ? `${result.total} invoices` : "Loading…"} · who paid, for what, to which doctor
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv}
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            ⬇ Download Excel
          </button>
          <button onClick={() => setShowModal(true)}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
            + Record payment
          </button>
        </div>
      </div>

      {/* Income summary strip */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Total income", value: money(summary.revenue_total), icon: "💰" },
            { label: "This week", value: money(summary.revenue_week), icon: "📅" },
            { label: "This month", value: money(summary.revenue_month), icon: "🗓️" },
            { label: "Pending", value: `${money(summary.pending_sum)} (${summary.pending_count})`, icon: "⏳" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xl" aria-hidden>{c.icon}</div>
              <div className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{c.value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Weekly + Monthly charts */}
      {summary && (
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarChart title="Last 7 days" data={summary.weekly} />
          <BarChart title="Last 6 months" data={summary.monthly} />
        </div>
      )}

      {/* Online vs Reception + filters */}
      {summary && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <span className="text-sm text-slate-500">Income source:</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            🌐 Online {money(summary.by_source.online)}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            🏥 Reception {money(summary.by_source.reception)}
          </span>
          <div className="ml-auto flex gap-3">
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
        </div>
      )}

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
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium text-right">Amount</th>
                <th className="px-6 py-4 font-medium">Paid via</th>
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
                  <td className="px-6 py-4 text-slate-600">{inv.doctor?.user?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{inv.department?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-600">{inv.description}</td>
                  <td className="px-6 py-4 text-right font-medium tabular-nums text-slate-900">{money(inv.amount)}</td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-600 capitalize">{inv.payment_method ?? "—"}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${inv.source === "online" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                      {inv.source === "online" ? "🌐 Online" : "🏥 Reception"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusPill[inv.status]}`}>{inv.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.status === "pending" && <MarkPaid id={inv.id} onDone={() => { load(page, deptId, status); loadSummary(); }} />}
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
          onSaved={() => { setShowModal(false); setPage(1); load(1, deptId, status); loadSummary(); }}
        />
      )}
    </div>
  );
}

/* ---------- Bar chart ---------- */

function BarChart({ title, data }: { title: string; data: { label: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 flex h-32 items-end gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5" title={`$${d.total.toFixed(2)}`}>
            <span className="text-[10px] tabular-nums text-slate-400">
              {d.total > 0 ? "$" + Math.round(d.total) : ""}
            </span>
            <div className="w-full rounded-t-md bg-blue-600 transition-all" style={{ height: `${Math.max((d.total / max) * 100, 2)}%` }} />
            <span className="text-[10px] text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Mark paid ---------- */

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

/* ---------- Record payment modal ---------- */

function RecordPaymentModal({ departments, onClose, onSaved }: { departments: Dept[]; onClose: () => void; onSaved: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<PatientRow[]>([]);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("paid");
  const [method, setMethod] = useState("cash");
  const [source, setSource] = useState("reception");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  useEffect(() => {
    api.get("/lookups/doctors").then((r) => setDoctors(r.data)).catch(() => {});
  }, []);

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
        doctor_id: doctorId ? Number(doctorId) : null,
        description,
        amount: Number(amount),
        status,
        payment_method: status === "paid" ? method : null,
        source,
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Record payment</h2>

        <div className="mt-5 space-y-4">
          {/* Patient (optional) */}
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

          {/* Department + Doctor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Doctor</label>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name}{d.specialization ? ` — ${d.specialization}` : ""}
                  </option>
                ))}
              </select>
            </div>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
                <option value="reception">Reception desk</option>
                <option value="online">Online booking</option>
              </select>
            </div>
          </div>

          {status === "paid" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Payment method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
          )}

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