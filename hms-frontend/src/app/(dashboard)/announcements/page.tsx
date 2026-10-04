"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Announcement = {
  id: number; title: string; body: string; is_active: boolean; created_at: string;
  creator: { name: string } | null;
};

export default function AnnouncementsPage() {
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = roles.includes("admin");

  const [items, setItems] = useState<Announcement[] | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get("/admin/announcements");
    setItems(data);
  }, []);

  useEffect(() => {
    if (isAdmin) load().catch(() => {});
  }, [isAdmin, load]);

  async function toggle(a: Announcement) {
    await api.put(`/admin/announcements/${a.id}`, { is_active: !a.is_active });
    load();
  }

  async function remove(a: Announcement) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await api.delete(`/admin/announcements/${a.id}`);
    load();
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
        Only admins can manage announcements.
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Announcements</h1>
          <p className="mt-1 text-sm text-slate-500">Posted to every staff member&apos;s dashboard.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + New announcement
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {!items ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No announcements yet.</div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {items.map((a) => (
              <li key={a.id} className={`px-6 py-4 ${!a.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900">{a.title}</span>
                      {a.is_active ? (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Live</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Hidden</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {a.creator?.name} · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-none gap-2">
                    <button onClick={() => toggle(a)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${a.is_active ? "border border-slate-300 text-slate-600 hover:bg-slate-50" : "bg-green-600 text-white hover:bg-green-700"}`}>
                      {a.is_active ? "Hide" : "Publish"}
                    </button>
                    <button onClick={() => remove(a)} className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <CreateModal onClose={() => setShowModal(false)} onDone={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}

function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  async function submit() {
    setSaving(true);
    await api.post("/admin/announcements", { title, body });
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">New announcement</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Message *</label>
            <textarea rows={4} className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving || !title.trim() || !body.trim()}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Posting…" : "Post announcement"}
          </button>
        </div>
      </div>
    </div>
  );
}