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

const invPill: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

const statIcons = [
  <svg {...iconProps} key="p" className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  <svg {...iconProps} key="a" className="h-5 w-5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>,
  <svg {...iconProps} key="r" className="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1-1.3-1.5-3-1.5s-3 .6-3 1.75c0 2.5 6 1.25 6 3.75 0 1.15-1.3 1.75-3 1.75s-3-.5-3-1.5"/></svg>,
  <svg {...iconProps} key="w" className="h-5 w-5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
];

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

  if (error) return (
    <div className="rounded-3xl border border-red-200 bg-white p-12 text-center shadow-sm">
      <p className="text-sm font-medium text-red-600">{error}</p>
    </div>
  );
  if (!data) return (
    <div className="space-y-6">
      <div className="h-16 w-72 animate-pulse rounded-3xl bg-[var(--primary-tint)]/15" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-[var(--primary-tint)]/15" />)}
      </div>
    </div>
  );

  const { department, staff, stats, recent_invoices } = data;

  const cards = [
    { label: "Personnel", value: stats.staff_count },
    { label: "Appointments", value: stats.appointments },
    { label: "Revenue (paid)", value: "$" + Number(stats.revenue).toLocaleString() },
    { label: "Pending", value: "$" + Number(stats.pending).toLocaleString() },
  ];

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[var(--primary-tint)]/20 text-[var(--primary)]">
          <svg {...iconProps} className="h-6 w-6"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><path d="M12 9v3M10.5 10.5h3"/></svg>
        </div>
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">{department.name}</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            <span className="mr-2 rounded-full bg-[var(--primary-tint)]/15 px-2 py-0.5 font-mono text-xs font-medium">{department.code}</span>
            {department.description ?? ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={c.label} className={`${cardCls} p-5 transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5`}>
            <span className="text-[var(--primary)]" aria-hidden>{statIcons[i]}</span>
            <div className="mt-2 font-heading text-2xl font-bold tabular-nums text-[var(--ink)]">{c.value}</div>
            <div className="mt-0.5 text-xs text-[var(--muted)]">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Personnel */}
        <div className={`${cardCls} overflow-hidden`}>
          <div className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
            <h2 className="font-heading font-semibold text-[var(--ink)]">Personnel ({staff.length})</h2>
          </div>
          {staff.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--muted)]">No staff assigned.</div>
          ) : (
            <ul className="divide-y divide-[var(--border)]/60">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-[var(--primary-tint)]/10">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--primary-tint)]/20 text-sm font-semibold text-[var(--primary)]">
                    {s.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[var(--ink)]">{s.user.name}</div>
                    <div className="text-xs text-[var(--muted)]">{s.user.email}</div>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${s.position === "doctor" ? "bg-[var(--primary-tint)]/25 text-[var(--primary)]" : "bg-emerald-100 text-emerald-700"}`}>
                      {s.position}
                    </span>
                    <div className="mt-1 text-xs text-[var(--muted)]">{s.specialization ?? s.employee_code}</div>
                    <div className="mt-1 flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => setEditingStaff(s)} className="text-xs font-medium text-[var(--primary)] transition hover:underline">Edit</button>
                      <button type="button" onClick={async () => {
                        if (confirm(`Remove ${s.user.name} from this department?`)) {
                          try {
                            await api.delete(`/admin/staff/${s.id}`);
                            refreshDepartment();
                          } catch {
                            setError("Could not remove this staff member.");
                          }
                        }
                      }} className="text-xs font-medium text-red-600 transition hover:underline">Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent invoices */}
        <div className={`${cardCls} overflow-hidden`}>
          <div className="border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
            <h2 className="font-heading font-semibold text-[var(--ink)]">Recent payments ({recent_invoices.length})</h2>
          </div>
          {recent_invoices.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--muted)]">No payments yet.</div>
          ) : (
            <ul className="divide-y divide-[var(--border)]/60">
              {recent_invoices.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 px-6 py-3.5 text-sm transition hover:bg-[var(--primary-tint)]/10">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--ink)]">{inv.description}</div>
                    <div className="text-xs text-[var(--muted)]">{inv.invoice_number} · {inv.patient ? `${inv.patient.first_name} ${inv.patient.last_name}` : "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-[var(--ink)]">${Number(inv.amount).toLocaleString()}</div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${invPill[inv.status]}`}>{inv.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section className={`${cardCls} mt-6 overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary-tint)]/10 px-6 py-4">
          <h2 className="font-heading font-semibold text-[var(--ink)]">
            Inventory
            {items.some((item) => item.quantity <= item.min_level) && (
              <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {items.filter((item) => item.quantity <= item.min_level).length} low stock
              </span>
            )}
          </h2>
          <button type="button" onClick={() => setEditingItem("new")} className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
            + Add item
          </button>
        </div>
        {inventoryError ? (
          <div className="p-10 text-center text-sm font-medium text-red-600">{inventoryError}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">No inventory items.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted)]">
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Min level</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const low = item.quantity <= item.min_level;
                  return (
                    <tr key={item.id} className={`border-b border-[var(--border)]/60 transition last:border-0 hover:bg-[var(--primary-tint)]/10 ${low ? "bg-amber-50/60" : ""}`}>
                      <td className="px-6 py-3 font-medium text-[var(--ink)]">{item.item_name}</td>
                      <td className="px-6 py-3 text-[var(--muted)]">{item.category ?? "—"}</td>
                      <td className={`px-6 py-3 tabular-nums ${low ? "font-semibold text-red-600" : "text-[var(--ink)]"}`}>
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-3 tabular-nums text-[var(--muted)]">{item.min_level}</td>
                      <td className="px-6 py-3 tabular-nums text-[var(--muted)]">{item.unit_price ? "$" + Number(item.unit_price).toFixed(2) : "—"}</td>
                      <td className="px-6 py-3 text-[var(--muted)]">{item.supplier ?? "—"}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-3">
                          <button type="button" onClick={() => setEditingItem(item)} className="text-xs font-medium text-[var(--primary)] transition hover:underline">Edit</button>
                          <button type="button" onClick={async () => {
                            if (confirm(`Delete ${item.item_name}?`)) {
                              try {
                                await api.delete(`/inventory/${item.id}`);
                                setItems((current) => current.filter((entry) => entry.id !== item.id));
                              } catch {
                                setInventoryError("Could not delete this inventory item.");
                              }
                            }
                          }} className="text-xs font-medium text-red-600 transition hover:underline">Delete</button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">{initial ? "Edit item" : "Add inventory item"}</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Item name *</label>
            <input required maxLength={150} className={inputCls} value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Category</label>
            <select className={inputCls} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="">—</option>
              <option value="Medicine">Medicine</option>
              <option value="Supply">Supply</option>
              <option value="Equipment">Equipment</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Unit</label>
            <input maxLength={20} className={inputCls} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="boxes, pcs, vials" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Quantity *</label>
            <input type="number" min="0" step="1" className={inputCls} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Min level (alert) *</label>
            <input type="number" min="0" step="1" className={inputCls} value={form.min_level} onChange={(event) => setForm({ ...form, min_level: event.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Unit price</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: event.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Supplier</label>
            <input maxLength={100} className={inputCls} value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} />
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !form.item_name.trim() || !form.quantity || !form.min_level}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">Edit staff: {staff.user.name}</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Position</label>
            <select className={inputCls} value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="technician">Technician</option>
              <option value="receptionist">Receptionist</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Specialization</label>
            <input maxLength={100} className={inputCls} value={form.specialization} onChange={(event) => setForm({ ...form, specialization: event.target.value })} />
          </div>
          <p className="text-xs text-[var(--muted)]">To change this person&apos;s department or account role, use Users &amp; Access.</p>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button type="button" onClick={submit} disabled={saving}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}