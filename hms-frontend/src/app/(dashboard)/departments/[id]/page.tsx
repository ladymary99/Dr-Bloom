"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

type InventoryItem = {
  id: number;
  item_name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  min_level: number;
  unit_price: string | null;
  supplier: string | null;
};

type StaffMember = {
  id: number;
  position: string;
  specialization: string | null;
  employee_code: string;
  department_id: number | null;
  user: { name: string; email: string };
};

type Detail = {
  department: { id: number; name: string; code: string; description: string | null };
  staff: StaffMember[];
  stats: { staff_count: number; appointments: number; revenue: number; pending: number; invoices_count: number };
  recent_invoices: { id: number; invoice_number: string; description: string; amount: string; status: string; patient: { first_name: string; last_name: string } | null }[];
};

const invPill: Record<string, string> = { paid: "bg-green-50 text-green-700", pending: "bg-amber-50 text-amber-700", cancelled: "bg-red-50 text-red-600" };

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [inventoryError, setInventoryError] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | "new" | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    if (id) api.get(`/departments/${id}`).then((r) => setData(r.data)).catch(() => setError("Could not load department."));
  }, [id]);

  useEffect(() => {
    if (id) {
      api.get("/inventory", { params: { department_id: id } })
        .then((r) => setItems(r.data))
        .catch(() => setInventoryError("Could not load inventory."));
    }
  }, [id]);

  function refreshDepartment() {
    api.get(`/departments/${id}`).then((r) => setData(r.data)).catch(() => setError("Could not refresh department."));
  }

  if (error) return <div className="rounded-2xl border border-red-200 bg-white p-12 text-center text-red-600">{error}</div>;
  if (!data) return <div className="p-12 text-center text-slate-500">Loading…</div>;

  const { department, staff, stats, recent_invoices } = data;

  const cards = [
    { label: "Personnel", value: stats.staff_count, icon: "👥" },
    { label: "Appointments", value: stats.appointments, icon: "📅" },
    { label: "Revenue (paid)", value: "$" + Number(stats.revenue).toLocaleString(), icon: "💰" },
    { label: "Pending", value: "$" + Number(stats.pending).toLocaleString(), icon: "⏳" },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">🏥</div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{department.name}</h1>
          <p className="text-sm text-slate-500">
            <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs">{department.code}</span>
            {department.description ?? ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-xl" aria-hidden>{c.icon}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{c.value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Personnel */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Personnel ({staff.length})</h2>
          </div>
          {staff.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No staff assigned.</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-700">
                    {s.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{s.user.name}</div>
                    <div className="text-xs text-slate-500">{s.user.email}</div>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${s.position === "doctor" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                      {s.position}
                    </span>
                    <div className="mt-1 text-xs text-slate-400">{s.specialization ?? s.employee_code}</div>
                    <div className="mt-1 flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => setEditingStaff(s)} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
                      <button type="button" onClick={async () => {
                        if (confirm(`Remove ${s.user.name} from this department?`)) {
                          try {
                            await api.delete(`/admin/staff/${s.id}`);
                            refreshDepartment();
                          } catch {
                            setError("Could not remove this staff member.");
                          }
                        }
                      }} className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent invoices */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Recent payments ({recent_invoices.length})</h2>
          </div>
          {recent_invoices.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No payments yet.</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recent_invoices.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 px-6 py-3.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-slate-900">{inv.description}</div>
                    <div className="text-xs text-slate-400">{inv.invoice_number} · {inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium tabular-nums text-slate-900">${Number(inv.amount).toLocaleString()}</div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${invPill[inv.status]}`}>{inv.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">
            Inventory
            {items.some((item) => item.quantity <= item.min_level) && (
              <span className="ml-2 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {items.filter((item) => item.quantity <= item.min_level).length} low stock
              </span>
            )}
          </h2>
          <button type="button" onClick={() => setEditingItem("new")} className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            + Add item
          </button>
        </div>
        {inventoryError ? (
          <div className="p-10 text-center text-red-600">{inventoryError}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No inventory items.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                  <th className="px-6 py-3 font-medium">Item</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Stock</th>
                  <th className="px-6 py-3 font-medium">Min level</th>
                  <th className="px-6 py-3 font-medium">Price</th>
                  <th className="px-6 py-3 font-medium">Supplier</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const low = item.quantity <= item.min_level;
                  return (
                    <tr key={item.id} className={`border-b border-slate-50 last:border-0 ${low ? "bg-amber-50/50" : ""}`}>
                      <td className="px-6 py-3 font-medium text-slate-900">{item.item_name}</td>
                      <td className="px-6 py-3 text-slate-600">{item.category ?? "—"}</td>
                      <td className={`px-6 py-3 tabular-nums ${low ? "font-semibold text-red-600" : "text-slate-900"}`}>
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-3 tabular-nums text-slate-500">{item.min_level}</td>
                      <td className="px-6 py-3 tabular-nums text-slate-600">{item.unit_price ? "$" + Number(item.unit_price).toFixed(2) : "—"}</td>
                      <td className="px-6 py-3 text-slate-600">{item.supplier ?? "—"}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-3">
                          <button type="button" onClick={() => setEditingItem(item)} className="text-xs font-medium text-blue-600 hover:underline">Edit</button>
                          <button type="button" onClick={async () => {
                            if (confirm(`Delete ${item.item_name}?`)) {
                              try {
                                await api.delete(`/inventory/${item.id}`);
                                setItems((current) => current.filter((entry) => entry.id !== item.id));
                              } catch {
                                setInventoryError("Could not delete this inventory item.");
                              }
                            }
                          }} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingItem && (
        <ItemModal
          key={editingItem === "new" ? "new" : editingItem.id}
          departmentId={Number(id)}
          initial={editingItem === "new" ? null : editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            api.get("/inventory", { params: { department_id: id } })
              .then((r) => setItems(r.data))
              .catch(() => setInventoryError("Could not refresh inventory."));
          }}
        />
      )}

      {editingStaff && (
        <StaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={() => {
            setEditingStaff(null);
            refreshDepartment();
          }}
        />
      )}
    </div>
  );
}

function ItemModal({ departmentId, initial, onClose, onSaved }: {
  departmentId: number;
  initial: InventoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    item_name: initial?.item_name ?? "",
    category: initial?.category ?? "",
    quantity: String(initial?.quantity ?? 0),
    unit: initial?.unit ?? "",
    min_level: String(initial?.min_level ?? 10),
    unit_price: initial?.unit_price ?? "",
    supplier: initial?.supplier ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  async function submit() {
    setSaving(true);
    setError("");
    const fields = {
      item_name: form.item_name.trim(),
      category: form.category || null,
      quantity: Number(form.quantity),
      unit: form.unit || null,
      min_level: Number(form.min_level),
      unit_price: form.unit_price ? Number(form.unit_price) : null,
      supplier: form.supplier || null,
    };
    try {
      if (initial) {
        await api.put(`/inventory/${initial.id}`, fields);
      } else {
        await api.post("/inventory", { ...fields, department_id: departmentId });
      }
      onSaved();
    } catch {
      setError("Could not save this inventory item. Check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">{initial ? "Edit item" : "Add inventory item"}</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Item name *</label>
            <input required maxLength={150} className={inputCls} value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select className={inputCls} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="">—</option>
              <option value="Medicine">Medicine</option>
              <option value="Supply">Supply</option>
              <option value="Equipment">Equipment</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
            <input maxLength={20} className={inputCls} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="boxes, pcs, vials" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantity *</label>
            <input type="number" min="0" step="1" className={inputCls} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Min level (alert) *</label>
            <input type="number" min="0" step="1" className={inputCls} value={form.min_level} onChange={(event) => setForm({ ...form, min_level: event.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Unit price</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: event.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Supplier</label>
            <input maxLength={100} className={inputCls} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} />
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !form.item_name.trim() || !form.quantity || !form.min_level}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : initial ? "Save changes" : "Add item"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StaffModal({ staff, onClose, onSaved }: { staff: StaffMember; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ position: staff.position, specialization: staff.specialization ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  async function submit() {
    setSaving(true);
    setError("");
    try {
      await api.put(`/admin/staff/${staff.id}`, {
        position: form.position,
        specialization: form.specialization || null,
      });
      onSaved();
    } catch {
      setError("Could not save staff changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Edit staff: {staff.user.name}</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Position</label>
            <select className={inputCls} value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="technician">Technician</option>
              <option value="receptionist">Receptionist</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Specialization</label>
            <input maxLength={100} className={inputCls} value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} />
          </div>
          <p className="text-xs text-slate-400">To change this person&apos;s department or account role, use Users &amp; Access.</p>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submit} disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}