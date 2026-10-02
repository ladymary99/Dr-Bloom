"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = { id: number; name: string };
type Dept = { id: number; name: string };

type StaffUser = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: { id: number; name: string }[];
  staff_profile: {
    position: string;
    specialization: string | null;
    department: { name: string } | null;
  } | null;
};

type Paginated = { data: StaffUser[]; current_page: number; last_page: number; total: number };

const rolePill: Record<string, string> = {
  admin: "bg-slate-900 text-white",
  doctor: "bg-blue-50 text-blue-700",
  nurse: "bg-green-50 text-green-700",
  receptionist: "bg-amber-50 text-amber-700",
};

export default function UsersPage() {
  const [result, setResult] = useState<Paginated | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StaffUser | "new" | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const { data } = await api.get("/admin/users", { params: { page: p } });
    setResult(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(page);
    api.get("/admin/roles").then((r) => setRoles(r.data));
    api.get("/departments").then((r) => setDepartments(r.data)).catch(() => {});
  }, [page, load]);

  async function toggleActive(u: StaffUser) {
    try {
      await api.put(`/admin/users/${u.id}`, { is_active: !u.is_active });
      load(page);
    } catch (e: any) {
      alert(e.response?.data?.message ?? "Action blocked.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users & Access</h1>
          <p className="mt-1 text-sm text-slate-500">
            {result ? `${result.total} accounts — control who can access what` : "Loading…"}
          </p>
        </div>
        <button onClick={() => setEditing("new")}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
          + Add user
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result?.data.map((u) => (
                <tr key={u.id} className={`border-b border-slate-50 last:border-0 ${!u.is_active ? "opacity-60" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.roles.map((r) => (
                      <span key={r.id} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${rolePill[r.name] ?? "bg-slate-100 text-slate-600"}`}>
                        {r.name}
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {u.staff_profile?.department?.name ?? "—"}
                    {u.staff_profile?.specialization && (
                      <div className="text-xs text-slate-400">{u.staff_profile.specialization}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.is_active ? (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">Deactivated</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditing(u)} className="text-xs font-medium text-blue-600 hover:underline">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(u)} className={`text-xs font-medium hover:underline ${u.is_active ? "text-red-600" : "text-green-600"}`}>
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
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

      {editing && (
        <UserModal
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          roles={roles}
          departments={departments}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(page); }}
        />
      )}
    </div>
  );
}

/* ---------- Create / edit user modal ---------- */

function UserModal({
  initial,
  roles,
  departments,
  onClose,
  onSaved,
}: {
  initial: StaffUser | null;
  roles: Role[];
  departments: Dept[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    role: initial?.roles[0]?.name ?? "receptionist",
    password: "",
    password_confirmation: "",
    department_id: "",
    specialization: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const clinical = form.role === "doctor" || form.role === "nurse";

  const inputCls =
    "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
  const err = (f: string) => (errors[f] ? <p className="mt-1 text-xs text-red-600">{errors[f]}</p> : null);

  async function submit() {
    setErrors({});
    setSaving(true);
    try {
      if (initial) {
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        await api.put(`/admin/users/${initial.id}`, payload);
        if (form.password) {
          await api.post(`/admin/users/${initial.id}/reset-password`, {
            password: form.password,
            password_confirmation: form.password_confirmation,
          });
        }
      } else {
        await api.post("/admin/users", {
          ...form,
          department_id: clinical && form.department_id ? Number(form.department_id) : null,
          specialization: clinical ? form.specialization || null : null,
        });
      }
      onSaved();
    } catch (e: any) {
      const errs = e.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const k of Object.keys(errs)) flat[k] = errs[k][0];
      if (e.response?.data?.message && !Object.keys(flat).length) flat._form = e.response.data.message;
      setErrors(flat);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">{initial ? "Edit user" : "Create user account"}</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {err("name")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {err("email")}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role *</label>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map((r) => (
                  <option key={r.id} value={r.name} className="capitalize">{r.name}</option>
                ))}
              </select>
              {err("role")}
            </div>
            {clinical && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                <select className={inputCls} value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">None</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {clinical && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Specialization</label>
              <input className={inputCls} value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Cardiology" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {initial ? "New password (optional)" : "Password *"}
              </label>
              <input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              {err("password")}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Confirm password</label>
              <input type="password" className={inputCls} value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-400">Minimum 8 characters. Resetting a password signs the user out on all devices.</p>
        </div>

        {errors._form && <div className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{errors._form}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : initial ? "Save changes" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}