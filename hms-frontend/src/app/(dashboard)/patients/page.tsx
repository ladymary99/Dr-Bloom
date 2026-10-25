"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import PatientFiles from "@/components/PatientFiles";
import PatientVaccinations from "@/components/PatientVaccinations";

type Patient = {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string | null;
  address: string | null;
  blood_type: string | null;
  allergies: string | null;
};

type Paginated = { data: Patient[]; current_page: number; last_page: number; total: number };

function age(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10);
}

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "male",
  phone: "",
  email: "",
  address: "",
  blood_type: "",
  allergies: "",
};

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

export default function PatientsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission("create patients");
  const canEdit = hasPermission("update patients");
  const roles = useAuthStore((s) => s.roles);
  const canManagePatientFiles = roles.includes("admin") || roles.includes("doctor");

  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Patient | "new" | null>(null);

  const load = useCallback(async (p: number, s: string) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/patients", {
        params: { page: p, search: s || undefined },
      });
      setResult(data);
    } catch {
      setError("Could not load patients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, search);
  }, [page, search, load]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Patients</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {result ? `${result.total} registered patients` : "Loading…"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={onSearch} className="flex gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or MRN…"
              className="w-56 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30"
            />
            <button type="submit"
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">
              Search
            </button>
          </form>
          {canCreate && (
            <button onClick={() => setEditing("new")}
              className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
              + Add patient
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        {error ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
          </div>
        ) : !loading && !result?.data.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--primary)]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No patients found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs font-semibold text-[var(--muted)]">
                <th className="px-6 py-4">MRN</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Age</th>
                <th className="px-6 py-4">Blood</th>
                <th className="px-6 py-4">Phone</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/60 last:border-0">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 animate-pulse rounded bg-[var(--primary-tint)]/20" style={{ width: `${55 + ((i * 7 + j * 13) % 35)}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : result!.data.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setEditing(p)}
                      className="cursor-pointer border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10"
                    >
                      <td className="px-6 py-4 font-medium text-[var(--primary)]">{p.mrn}</td>
                      <td className="px-6 py-4 font-medium text-[var(--ink)]">{p.first_name} {p.last_name}</td>
                      <td className="px-6 py-4 capitalize text-[var(--muted)]">{p.gender}</td>
                      <td className="px-6 py-4 tabular-nums text-[var(--muted)]">{age(p.date_of_birth)}</td>
                      <td className="px-6 py-4">
                        {p.blood_type ? (
                          <span className="rounded-full bg-[var(--primary-tint)]/25 px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">{p.blood_type}</span>
                        ) : (
                          <span className="text-[var(--muted)]/50">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 tabular-nums text-[var(--muted)]">{p.phone}</td>
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
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]">
                ← Previous
              </button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <PatientModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          canEdit={editing === "new" || canEdit}
          canManagePatientFiles={canManagePatientFiles}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(page, search); }}
        />
      )}
    </div>
  );
}

/* ---------- Add / Edit patient modal ---------- */

function PatientModal({
  initial,
  canEdit,
  canManagePatientFiles,
  onClose,
  onSaved,
}: {
  initial: Patient | null;
  canEdit: boolean;
  canManagePatientFiles: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canDelete = hasPermission("delete patients");

  const [form, setForm] = useState(() =>
    initial
      ? {
          first_name: initial.first_name,
          last_name: initial.last_name,
          date_of_birth: initial.date_of_birth.slice(0, 10),
          gender: initial.gender,
          phone: initial.phone ?? "",
          email: initial.email ?? "",
          address: initial.address ?? "",
          blood_type: initial.blood_type ?? "",
          allergies: initial.allergies ?? "",
        }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, blood_type: form.blood_type || null };
      if (initial) {
        await api.put(`/patients/${initial.id}`, payload);
      } else {
        await api.post("/patients", payload);
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: Record<string, string[]>, message?: string } } };
      const errs = err.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const k of Object.keys(errs)) flat[k] = errs[k][0];
      if (err.response?.data?.message && !Object.keys(flat).length) {
        flat._form = err.response.data.message;
      }
      setErrors(flat);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial || !confirm(`Archive ${initial.first_name} ${initial.last_name}? This is a soft delete — the record is kept for audit.`)) return;
    await api.delete(`/patients/${initial.id}`);
    onSaved();
  }

  const err = (f: string) =>
    errors[f] ? <p className="mt-1 text-xs text-red-600">{errors[f]}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">
            {initial ? (canEdit ? "Edit patient" : "Patient record") : "Register new patient"}
          </h2>
          {initial && (
            <span className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-1 text-xs font-semibold text-[var(--primary)]">{initial.mrn}</span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">First name *</label>
            <input disabled={!canEdit} className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            {err("first_name")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Last name *</label>
            <input disabled={!canEdit} className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            {err("last_name")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Date of birth *</label>
            <input disabled={!canEdit} type="date" className={inputCls} value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            {err("date_of_birth")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Gender *</label>
            <select disabled={!canEdit} className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {err("gender")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Phone</label>
            <input disabled={!canEdit} className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXXX" />
            {err("phone")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Email</label>
            <input disabled={!canEdit} type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
            {err("email")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Blood type</label>
            <select disabled={!canEdit} className={inputCls} value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)}>
              <option value="">Unknown</option>
              {bloodTypes.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Allergies</label>
            <input disabled={!canEdit} className={inputCls} value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. Penicillin" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Address</label>
            <input disabled={!canEdit} className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>

        {errors._form && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{errors._form}</div>
        )}

        {initial && canManagePatientFiles && <PatientVaccinations patientId={initial.id} />}

        {initial && canManagePatientFiles && (
          <PatientFiles basePath={`/patients/${initial.id}`} canDelete />
        )}

        <div className="mt-6 flex items-center justify-between">
          <div>
            {initial && canDelete && (
              <button onClick={remove}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
                Archive patient
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">
              Cancel
            </button>
            {canEdit && <button onClick={submit} disabled={saving}
              className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
              {saving ? "Saving…" : initial ? "Save changes" : "Register patient"}
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
}