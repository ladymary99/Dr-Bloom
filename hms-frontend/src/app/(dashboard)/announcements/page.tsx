"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Target = "all_staff" | "doctors" | "patients" | "everyone";

type Announcement = {
  id: number; title: string; body: string; is_active: boolean;
  target: Target; publish_at: string | null; expires_at: string | null;
  status: "scheduled" | "live" | "expired" | "hidden";
  created_at: string;
  creator: { name: string } | null;
};

const TARGETS: { value: Target; label: string }[] = [
  { value: "all_staff", label: "All staff" },
  { value: "doctors", label: "Doctors only" },
  { value: "patients", label: "Patients (portal)" },
  { value: "everyone", label: "Everyone (staff + patients)" },
];

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-700",
  live: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-600",
  hidden: "bg-[var(--primary-tint)]/15 text-[var(--muted)]",
};

const TARGET_BADGE: Record<Target, string> = {
  all_staff: "bg-[var(--primary-tint)]/25 text-[var(--primary)]",
  doctors: "bg-blue-100 text-blue-700",
  patients: "bg-purple-100 text-purple-700",
  everyone: "bg-emerald-100 text-emerald-700",
};

const cardCls =
  "rounded-3xl border border-[var(--border)] bg-white shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5";

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-tint)]/30";

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

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
      <div className={`${cardCls} p-12 text-center`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
          <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <p className="mt-3 text-sm font-medium text-[var(--ink)]">Only admins can manage announcements.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up w-full">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--ink)]">Announcements</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Targeted, scheduled messages for staff and patients.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20">
          + New announcement
        </button>
      </div>

      <div className={`${cardCls} !p-0 overflow-hidden`}>
        {!items ? (
          <ul className="divide-y divide-[var(--border)]/60">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="px-6 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-[var(--primary-tint)]/20" />
                <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-[var(--primary-tint)]/15" />
                <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[var(--primary-tint)]/15" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-tint)]/20">
              <svg {...iconProps} className="h-5 w-5 text-[var(--primary)]"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">No announcements yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]/60">
            {items.map((a) => (
              <li key={a.id} className={`px-6 py-4 transition hover:bg-[var(--primary-tint)]/10 ${a.status !== "live" ? "opacity-70" : ""}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-heading font-semibold text-[var(--ink)]">{a.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_BADGE[a.status]}`}>
                        {a.status}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TARGET_BADGE[a.target]}`}>
                        {TARGETS.find((t) => t.value === a.target)?.label ?? a.target}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{a.body}</p>
                    <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs tabular-nums text-[var(--muted)]/70">
                      <span>by {a.creator?.name ?? "—"}</span>
                      <span>publish: {fmtDateTime(a.publish_at)}</span>
                      <span>expires: {fmtDateTime(a.expires_at)}</span>
                    </p>
                  </div>
                  <div className="flex flex-none gap-2">
                    <button onClick={() => toggle(a)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${a.is_active ? "border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]" : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"}`}>
                      {a.is_active ? "Hide" : "Publish"}
                    </button>
                    <button onClick={() => remove(a)} className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50">
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
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<Target>("all_staff");
  const [publishAt, setPublishAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /* lock page scroll behind the modal */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    setMounted(true);
    return () => { document.body.style.overflow = ""; };
  }, []);

  const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

  async function submit() {
    setError("");
    setSaving(true);
    try {
      await api.post("/admin/announcements", {
        title,
        body,
        target,
        publish_at: toIso(publishAt),
        expires_at: toIso(expiresAt),
      });
      onDone();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      setError(data?.errors ? Object.values(data.errors).flat()[0] : data?.message ?? "Could not create announcement.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--ink)]/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">New announcement</h2>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Title *</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Message *</label>
            <textarea rows={4} className={inputCls} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Audience *</label>
            <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value as Target)}>
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Publish at</label>
              <input type="datetime-local" className={inputCls} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
              <p className="mt-1 text-[11px] text-[var(--muted)]">Leave empty to publish now</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--ink)]">Expires at</label>
              <input type="datetime-local" className={inputCls} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              <p className="mt-1 text-[11px] text-[var(--muted)]">Leave empty to never expire</p>
            </div>
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--primary-tint)]/10 hover:text-[var(--ink)]">Cancel</button>
          <button onClick={submit} disabled={saving || !title.trim() || !body.trim()}
            className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0">
            {saving ? "Posting…" : target === "patients" || target === "everyone" ? "Publish announcement" : "Post announcement"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}