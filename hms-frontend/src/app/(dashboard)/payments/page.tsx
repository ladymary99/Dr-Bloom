"use client";

/* eslint-disable react-hooks/set-state-in-effect */

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
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
};

const money = (v: number | string) =>
  "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

const statIcons = [
  <svg {...iconProps} key="t" className="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1-1.3-1.5-3-1.5s-3 .6-3 1.75c0 2.5 6 1.25 6 3.75 0 1.15-1.3 1.75-3 1.75s-3-.5-3-1.5"/></svg>,
  <svg {...iconProps} key="w" className="h-5 w-5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>,
  <svg {...iconProps} key="m" className="h-5 w-5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  <svg {...iconProps} key="p" className="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
];

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

  const stats = summary
    ? [
        { label: "Total income", value: money(summary.revenue_total), icon: statIcons[0], tint: "text-[var(--primary)]" },
        { label: "This week", value: money(summary.revenue_week), icon: statIcons[1], tint: "text-[var(--primary)]" },
        { label: "This month", value: money(summary.revenue_month), icon: statIcons[2], tint: "text-[var(--primary)]" },
        { label: "Pending", value: `${money(summary.pending_sum)} (${summary.pending_count})`, icon: statIcons[3], tint: "text-amber-600" },
      ]
    : [];

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Income & Payments</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {result ? `${result.total} invoices` : "Loading…"} · who paid, for what, to which doctor
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-5 py-2 text-sm font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">
            <svg {...iconProps} className="h-4 w-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></svg>
            Download Excel
          </button>
          <button onClick={() => setShowModal(true)}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
            + Record payment
          </button>
        </div>
      </div>

      {/* Income summary strip */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((c) => (
            <div key={c.label} className={`${cardCls} !p-5`}>
              <span className={c.tint} aria-hidden>{c.icon}</span>
              <div className="mt-2 font-heading text-xl font-bold tabular-nums text-[var(--ink)]">{c.value}</div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">{c.label}</div>
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
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
          <span className="text-sm text-[var(--muted)]">Income source:</span>
          <span className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-1 text-sm font-semibold text-[var(--primary)]">
            Online {money(summary.by_source.online)}
          </span>
          <span className="rounded-full bg-[var(--primary-tint)]/10 px-3 py-1 text-sm font-semibold text-[var(--muted)]">
            Reception {money(summary.by_source.reception)}
          </span>
          <div className="ml-auto flex gap-3">
            <select value={deptId} onChange={(e) => { setDeptId(e.target.value); setPage(1); }}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30">
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm capitalize text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        {loading ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Paid via</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]/60 last:border-0">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 animate-pulse rounded bg-[var(--primary-tint)]/20" style={{ width: `${45 + ((i * 7 + j * 11) % 40)}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : !result?.data.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No invoices found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Paid via</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {result.data.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10">
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--primary)]">{inv.invoice_number}</div>
                    <div className="text-xs tabular-nums text-[var(--muted)]">{new Date(inv.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-[var(--ink)]">{inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : "—"}</div>
                    <div className="text-xs text-[var(--muted)]">{inv.patient?.mrn}</div>
                  </td>
                  <td className="px-6 py-4 text-[var(--muted)]">{inv.doctor?.user?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{inv.department?.name ?? "—"}</td>
                  <td className="px-6 py-4 text-[var(--muted)]">{inv.description}</td>
                  <td className="px-6 py-4 text-right font-semibold tabular-nums text-[var(--ink)]">{money(inv.amount)}</td>
                  <td className="px-6 py-4">
                    <div className="text-xs capitalize text-[var(--muted)]">{inv.payment_method ?? "—"}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${inv.source === "online" ? "bg-[var(--primary-tint)]/25 text-[var(--primary)]" : "bg-[var(--primary-tint)]/10 text-[var(--muted)]"}`}>
                      {inv.source === "online" ? "Online" : "Reception"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusPill[inv.status]}`}>{inv.status}</span>
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
          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
            <span className="text-sm tabular-nums text-[var(--muted)]">Page {result.current_page} of {result.last_page}</span>
            <div className="flex gap-2">
              <button disabled={result.current_page === 1} onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]">← Previous</button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]">Next →</button>
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
    <div className={`${cardCls} !p-6`}>
      <h2 className="font-heading font-semibold text-[var(--ink)]">{title}</h2>
      <div className="mt-4 flex h-32 items-end gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5" title={`$${d.total.toFixed(2)}`}>
            <span className="text-[10px] tabular-nums text-[var(--muted)]">
              {d.total > 0 ? "$" + Math.round(d.total) : ""}
            </span>
            <div
              className="w-full rounded-t-lg bg-[var(--primary)]/80 transition-all duration-500 hover:bg-[var(--primary)]"
              style={{ height: `${Math.max((d.total / max) * 100, 2)}%` }}
            />
            <span className="text-[10px] text-[var(--muted)]">{d.label}</span>
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
        className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-xs text-[var(--ink)] outline-none transition focus:border-[var(--primary)]">
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="transfer">Transfer</option>
      </select>
      <button onClick={go} disabled={busy}
        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Record payment</h2>

        <div className="mt-5 space-y-4">
          {/* Patient (optional) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Patient <span className="font-normal text-[var(--muted)]">(optional)</span></label>
            {patient ? (
              <div className="flex items-center justify-between rounded-xl bg-[var(--primary-tint)]/15 px-4 py-2.5 text-sm">
                <span className="text-[var(--ink)]"><b>{patient.first_name} {patient.last_name}</b> <span className="font-medium text-[var(--primary)]">{patient.mrn}</span></span>
                <button onClick={() => setPatient(null)} className="text-[var(--muted)] transition hover:text-red-600">✕</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchPatients())}
                    placeholder="Search name or MRN…" className={inputCls} />
                  <button onClick={searchPatients} className="rounded-full border border-[var(--border)] bg-white px-4 text-sm font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">Search</button>
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

          {/* Department + Doctor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Doctor</label>
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
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Description *</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Consultation fee" className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Amount *</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
                <option value="reception">Reception desk</option>
                <option value="online">Online booking</option>
              </select>
            </div>
          </div>

          {status === "paid" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Payment method</label>
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
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
            {saving ? "Saving…" : "Record payment"}
          </button>
        </div>
      </div>
    </div>
  );
}