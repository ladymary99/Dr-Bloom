"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

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

export default function PatientsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission("create patients");
  const canEdit = hasPermission("update patients");

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
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">
            {result ? `${result.total} registered patients` : "Loading…"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <form onSubmit={onSearch} className="flex gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or MRN…"
              className="w-56 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
            <button type="submit"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Search
            </button>
          </form>
          {canCreate && (
            <button onClick={() => setEditing("new")}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
              + Add patient
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading patients…</div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">{error}</div>
        ) : !result?.data.length ? (
          <div className="p-12 text-center text-slate-500">No patients found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-6 py-4 font-medium">MRN</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Gender</th>
                <th className="px-6 py-4 font-medium">Age</th>
                <th className="px-6 py-4 font-medium">Blood</th>
                <th className="px-6 py-4 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => canEdit && setEditing(p)}
                  className={`border-b border-slate-50 transition last:border-0 ${canEdit ? "cursor-pointer hover:bg-slate-50" : ""}`}
                >
                  <td className="px-6 py-4 font-medium text-blue-700">{p.mrn}</td>
                  <td className="px-6 py-4 text-slate-900">{p.first_name} {p.last_name}</td>
                  <td className="px-6 py-4 capitalize text-slate-600">{p.gender}</td>
                  <td className="px-6 py-4 text-slate-600">{age(p.date_of_birth)}</td>
                  <td className="px-6 py-4">
                    {p.blood_type ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{p.blood_type}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{p.phone}</td>
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
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                ← Previous
              </button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">
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
  onClose,
  onSaved,
}: {
  initial: Patient | null;
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

  const inputCls =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
  const err = (f: string) =>
    errors[f] ? <p className="mt-1 text-xs text-red-600">{errors[f]}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {initial ? "Edit patient" : "Register new patient"}
          </h2>
          {initial && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{initial.mrn}</span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">First name *</label>
            <input className={inputCls} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
            {err("first_name")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Last name *</label>
            <input className={inputCls} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
            {err("last_name")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date of birth *</label>
            <input type="date" className={inputCls} value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            {err("date_of_birth")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Gender *</label>
            <select className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {err("gender")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXXX" />
            {err("phone")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
            {err("email")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Blood type</label>
            <select className={inputCls} value={form.blood_type} onChange={(e) => set("blood_type", e.target.value)}>
              <option value="">Unknown</option>
              {bloodTypes.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Allergies</label>
            <input className={inputCls} value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. Penicillin" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>

        {errors._form && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{errors._form}</div>
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
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={submit} disabled={saving}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
              {saving ? "Saving…" : initial ? "Save changes" : "Register patient"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}