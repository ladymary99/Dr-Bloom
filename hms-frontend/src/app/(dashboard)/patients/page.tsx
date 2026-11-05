"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { fmtShortDate, fmtShortDateTime } from "@/lib/format";
import { PatientLookupModal } from "@/components/BreakGlass";
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
  last_visit_at?: string | null;
  next_appointment_at?: string | null;
  primary_doctor?: string | null;
  is_admitted?: boolean;
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

type SortKey = "name" | "last_visit" | "next_appointment" | "created";

export default function PatientsPage() {
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission("create patients");
  const canEdit = hasPermission("update patients");
  const roles = useAuthStore((s) => s.roles);
  const canManagePatientFiles = roles.includes("admin") || roles.includes("doctor");
  const restricted = roles.includes("doctor") && !roles.includes("admin");

  const [result, setResult] = useState<Paginated | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filters, setFilters] = useState({ gender: "", blood_type: "", age_min: "", age_max: "", condition: "", admitted: false });
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created", dir: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Patient | "new" | null>(null);
  const [lookup, setLookup] = useState(false);
  const seq = useRef(0);

  // search as you type (debounced); any change goes back to page 1
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/patients", {
        params: {
          page, search: debounced || undefined, sort: sort.key, dir: sort.dir,
          gender: filters.gender || undefined, blood_type: filters.blood_type || undefined, condition: filters.condition || undefined,
          age_min: filters.age_min || undefined, age_max: filters.age_max || undefined, admitted: filters.admitted ? 1 : undefined,
        },
      });
      if (id === seq.current) setResult(data);
    } catch {
      if (id === seq.current) setError("Could not load patients.");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [page, debounced, sort, filters]);

  useEffect(() => { load(); }, [load]);

  const activeFilters = [filters.gender, filters.blood_type, filters.age_min, filters.age_max, filters.condition].filter(Boolean).length + (filters.admitted ? 1 : 0);
  const setFilter = (patch: Partial<typeof filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const toggleSort = (key: SortKey) => { setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })); setPage(1); };
  const sortHead = (key: SortKey, label: string) => (
    <th className="px-4 py-4" aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} scope="col">
      <button onClick={() => toggleSort(key)} className="flex items-center gap-1 font-semibold hover:text-[var(--primary)]">{label}<span aria-hidden className="text-[10px]">{sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</span></button>
    </th>
  );
  const selCls = "rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--ink)]";

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Patients</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{result ? `${result.total} ${restricted ? "patients under your care" : "registered patients"}` : "Loading…"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <label htmlFor="patient-search" className="sr-only">Search patients by name or MRN</label>
            <input id="patient-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or MRN…"
              className="w-60 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)]" />
          </div>
          <button onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-sm hover:border-[var(--primary-tint)]">
            Filters{activeFilters > 0 && <span className="ml-1.5 rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilters}</span>}
          </button>
          {restricted && <button onClick={() => setLookup(true)} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] shadow-sm hover:border-[var(--primary-tint)]">Find any patient</button>}
          {canCreate && (
            <button onClick={() => setEditing("new")} className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">+ Add patient</button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold text-[var(--ink)]">Gender<select value={filters.gender} onChange={(e) => setFilter({ gender: e.target.value })} className={`${selCls} mt-1 block`}><option value="">Any</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
          <label className="text-xs font-semibold text-[var(--ink)]">Blood type<select value={filters.blood_type} onChange={(e) => setFilter({ blood_type: e.target.value })} className={`${selCls} mt-1 block`}><option value="">Any</option>{bloodTypes.map((b) => <option key={b}>{b}</option>)}</select></label>
          <label className="text-xs font-semibold text-[var(--ink)]">Age from<input type="number" min={0} max={130} value={filters.age_min} onChange={(e) => setFilter({ age_min: e.target.value })} className={`${selCls} mt-1 block w-20`} /></label>
          <label className="text-xs font-semibold text-[var(--ink)]">to<input type="number" min={0} max={130} value={filters.age_max} onChange={(e) => setFilter({ age_max: e.target.value })} className={`${selCls} mt-1 block w-20`} /></label>
          <label className="text-xs font-semibold text-[var(--ink)]">Condition<input value={filters.condition} placeholder="e.g. diabetes" onChange={(e) => setFilter({ condition: e.target.value })} className={`${selCls} mt-1 block w-44`} /></label>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={filters.admitted} onChange={(e) => setFilter({ admitted: e.target.checked })} />Currently admitted</label>
          {activeFilters > 0 && <button onClick={() => setFilter({ gender: "", blood_type: "", age_min: "", age_max: "", condition: "", admitted: false })} className="pb-2 text-sm font-medium text-[var(--primary)] underline">Clear</button>}
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-[var(--border)] bg-white shadow-sm">
        {error ? (
          <div role="alert" className="p-12 text-center"><p className="text-sm font-medium text-red-700">{error}</p><button onClick={load} className="mt-3 rounded-full border border-[var(--border)] px-4 py-1.5 text-sm">Try again</button></div>
        ) : !loading && !result?.data.length ? (
          <div className="p-12 text-center"><p className="text-sm font-medium text-[var(--ink)]">{debounced || activeFilters ? "No patients match your search." : restricted ? "No patients under your care yet." : "No patients yet."}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{restricted && !debounced ? "Patients appear here once they book with you. Use “Find any patient” for an emergency." : "Try a different name or clear the filters."}</p></div>
        ) : (
          <table className="w-full min-w-[56rem] text-sm">
            <caption className="sr-only">Patients</caption>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 text-left text-xs text-[var(--muted)]">
                {sortHead("name", "Patient")}
                <th scope="col" className="px-4 py-4 font-semibold">Age · sex</th>
                {sortHead("last_visit", "Last visit")}
                {sortHead("next_appointment", "Next appointment")}
                <th scope="col" className="px-4 py-4 font-semibold">Primary doctor</th>
                <th scope="col" className="px-4 py-4 font-semibold">Status</th>
                <th scope="col" className="px-4 py-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading && !result
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/60 last:border-0">{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-[var(--primary-tint)]/20" style={{ width: `${55 + ((i * 7 + j * 13) % 35)}%` }} /></td>)}</tr>
                  ))
                : result!.data.map((p) => (
                    <tr key={p.id} onClick={() => router.push(`/patients/${p.id}`)} className={`cursor-pointer border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10 ${loading ? "opacity-60" : ""}`}>
                      <th scope="row" className="px-4 py-3 text-left font-normal">
                        <Link href={`/patients/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-[var(--ink)] hover:underline">{p.first_name} {p.last_name}</Link>
                        <span className="block text-xs text-[var(--muted)]">{p.mrn}{p.blood_type ? ` · ${p.blood_type}` : ""}</span>
                      </th>
                      <td className="px-4 py-3 capitalize text-[var(--ink)]">{age(p.date_of_birth)} · {p.gender}</td>
                      <td className="px-4 py-3 text-[var(--ink)]">{p.last_visit_at ? fmtShortDate(p.last_visit_at) : <span className="text-[var(--muted)]">—</span>}</td>
                      <td className="px-4 py-3 text-[var(--ink)]">{p.next_appointment_at ? fmtShortDateTime(p.next_appointment_at) : <span className="text-[var(--muted)]">—</span>}</td>
                      <td className="px-4 py-3 text-[var(--ink)]">{p.primary_doctor ?? <span className="text-[var(--muted)]">—</span>}</td>
                      <td className="px-4 py-3">{p.is_admitted ? <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900">Admitted</span> : <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">Outpatient</span>}</td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && <button onClick={(e) => { e.stopPropagation(); setEditing(p); }} className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-tint)]/25" aria-label={`Edit ${p.first_name} ${p.last_name}`}>Edit</button>}
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
              <button disabled={result.current_page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--primary-tint)] disabled:opacity-40">← Previous</button>
              <button disabled={result.current_page === result.last_page} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--primary-tint)] disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <PatientModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          canEdit={editing === "new" || canEdit}
          canManagePatientFiles={canManagePatientFiles}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <PatientLookupModal open={lookup} onClose={() => setLookup(false)} />
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

  const [dupes, setDupes] = useState<{ id: string; mrn: string; first_name: string; last_name: string; date_of_birth: string }[] | null>(null);

  async function submit(confirmDuplicate = false) {
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, blood_type: form.blood_type || null, ...(confirmDuplicate ? { confirm_duplicate: true } : {}) };
      if (initial) {
        await api.put(`/patients/${initial.id}`, payload);
      } else {
        await api.post("/patients", payload);
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { errors?: Record<string, string[]>, message?: string, code?: string, matches?: typeof dupes } } };
      if (err.response?.status === 409 && err.response.data?.code === "possible_duplicate") {
        setDupes(err.response.data.matches ?? []);   // let staff look before a second chart is created
        return;
      }
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

        {dupes && (
          <div role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">A patient with this name and date of birth already exists.</p>
            <ul className="mt-2 space-y-1">{dupes.map((d) => <li key={d.id}><Link href={`/patients/${d.id}`} className="font-medium underline">{d.first_name} {d.last_name}</Link> · {d.mrn} · born {fmtShortDate(d.date_of_birth.slice(0, 10) + "T00:00:00")}</li>)}</ul>
            <p className="mt-2">Open the existing chart, or create a new one only if this is truly a different person.</p>
            <button type="button" onClick={() => { setDupes(null); submit(true); }} className="mt-3 rounded-full border border-amber-400 bg-white px-4 py-1.5 text-sm font-semibold">Create anyway</button>
          </div>
        )}

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
            {canEdit && <button onClick={() => submit()} disabled={saving}
              className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
              {saving ? "Saving…" : initial ? "Save changes" : "Register patient"}
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
}