"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Department = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  staff_count: number;
  appointments_count: number;
};

const EMPTY = { name: "", code: "", description: "" };

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Department | "new" | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async (inc: boolean) => {
    const { data } = await api.get("/departments", { params: { include_inactive: inc ? 1 : undefined } });
    setDepartments(data);
  }, []);

  useEffect(() => {
    load(showInactive).catch(() => setError("Could not load departments."));
  }, [showInactive, load]);

  async function toggleActive(d: Department) {
    await api.put(`/departments/${d.id}`, { is_active: !d.is_active });
    load(showInactive);
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Departments</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {departments ? `${departments.length} departments` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--ink)]">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Show inactive
          </label>
          <button onClick={() => setEditing("new")}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
            + Add department
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg {...iconProps} className="h-5 w-5 text-red-500"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          </div>
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        </div>
      ) : !departments ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl border border-[var(--border)] bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <div
              key={d.id}
              onClick={() => d.is_active && router.push(`/departments/${d.id}`)}
              className={`${cardCls} p-6 ${d.is_active ? "cursor-pointer hover:-translate-y-0.5" : "opacity-60"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-tint)]/20 text-[var(--primary)]">
                  <svg {...iconProps} className="h-5 w-5"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><path d="M12 9v3M10.5 10.5h3"/></svg>
                </div>
                <div className="flex items-center gap-2">
                  {!d.is_active && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">Inactive</span>
                  )}
                  <span className="rounded-full bg-[var(--primary-tint)]/15 px-2.5 py-0.5 font-mono text-xs font-medium text-[var(--muted)]">{d.code}</span>
                </div>
              </div>
              <h2 className="mt-4 font-heading font-semibold text-[var(--ink)]">{d.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{d.description ?? "No description."}</p>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)]/60 pt-4">
                <div className="flex gap-4 text-sm text-[var(--muted)]">
                  <span><b className="font-semibold tabular-nums text-[var(--ink)]">{d.staff_count}</b> staff</span>
                  <span><b className="font-semibold tabular-nums text-[var(--ink)]">{d.appointments_count}</b> appt.</span>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditing(d)} title="Edit"
                    className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--primary-tint)] hover:text-[var(--primary)]">Edit</button>
                  <button onClick={() => toggleActive(d)} title={d.is_active ? "Deactivate" : "Activate"}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${d.is_active ? "border border-red-200 text-red-600 hover:bg-red-50" : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"}`}>
                    {d.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <DepartmentModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(showInactive); }}
        />
      )}
    </div>
  );
}

function DepartmentModal({ initial, onClose, onSaved }: { initial: Department | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial
    ? { name: initial.name, code: initial.code, description: initial.description ?? "" }
    : { ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

  async function submit() {
    setErrors({});
    setSaving(true);
    try {
      if (initial) {
        await api.put(`/departments/${initial.id}`, form);
      } else {
        await api.post("/departments", form);
      }
      onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: Record<string, string[]> } } };
      const errs = err.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const k of Object.keys(errs)) flat[k] = errs[k][0];
      setErrors(flat);
    } finally {
      setSaving(false);
    }
  }

  const err = (f: string) => (errors[f] ? <p className="mt-1 text-xs text-red-600">{errors[f]}</p> : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">{initial ? "Edit department" : "Add department"}</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {err("name")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Code * <span className="font-normal text-[var(--muted)]">(short, unique)</span></label>
            <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. DERM" />
            {err("code")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Description</label>
            <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
            {saving ? "Saving…" : initial ? "Save changes" : "Create department"}
          </button>
        </div>
      </div>
    </div>
  );
}