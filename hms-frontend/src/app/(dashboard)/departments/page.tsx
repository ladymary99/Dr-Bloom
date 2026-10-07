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
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          <p className="mt-1 text-sm text-slate-500">
            {departments ? `${departments.length} departments` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 accent-blue-600" />
            Show inactive
          </label>
          <button onClick={() => setEditing("new")}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
            + Add department
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-white p-12 text-center text-red-600">{error}</div>
      ) : !departments ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((d) => (
            <div
              key={d.id}
              onClick={() => d.is_active && router.push(`/departments/${d.id}`)}
              className={`rounded-2xl border border-slate-200 bg-white p-6 transition ${d.is_active ? "cursor-pointer hover:border-blue-200 hover:shadow-sm" : "opacity-60"}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">🏥</div>
                <div className="flex items-center gap-2">
                  {!d.is_active && (
                    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">Inactive</span>
                  )}
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-600">{d.code}</span>
                </div>
              </div>
              <h2 className="mt-4 font-semibold text-slate-900">{d.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{d.description ?? "No description."}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex gap-4 text-sm text-slate-600">
                  <span><b className="font-semibold text-slate-900">{d.staff_count}</b> staff</span>
                  <span><b className="font-semibold text-slate-900">{d.appointments_count}</b> appt.</span>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditing(d)} title="Edit"
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">✏️ Edit</button>
                  <button onClick={() => toggleActive(d)} title={d.is_active ? "Deactivate" : "Activate"}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${d.is_active ? "border border-red-200 text-red-600 hover:bg-red-50" : "bg-green-600 text-white hover:bg-green-700"}`}>
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

  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">{initial ? "Edit department" : "Add department"}</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {err("name")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Code * <span className="text-slate-400">(short, unique)</span></label>
            <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. DERM" />
            {err("code")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : initial ? "Save changes" : "Create department"}
          </button>
        </div>
      </div>
    </div>
  );
}