"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Announcement = { id: number; title: string; body: string };

const iconProps = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.7,
  strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24",
} as const;

export default function AnnouncementBanner({ endpoint = "/announcements" }: { endpoint?: string }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    api.get(endpoint).then((r) => setItems(r.data)).catch(() => {});
    try {
      setDismissed(JSON.parse(localStorage.getItem("dismissed-announcements") ?? "[]"));
    } catch {
      setDismissed([]);
    }
  }, [endpoint]);

  function dismiss(id: number) {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("dismissed-announcements", JSON.stringify(next));
  }

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {visible.map((a) => (
        <div key={a.id} role="status"
          className="flex items-start gap-3 rounded-3xl border border-[var(--primary-tint)]/50 bg-[var(--primary-tint)]/20 px-5 py-3.5">
          <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/60 text-[var(--primary)]">
            <svg {...iconProps} className="h-4 w-4"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--ink)]">{a.title}</div>
            <div className="mt-0.5 text-sm text-[var(--muted)]">{a.body}</div>
          </div>
          <button onClick={() => dismiss(a.id)} className="flex-none rounded-full p-1 text-[var(--muted)]/60 transition hover:bg-white/60 hover:text-[var(--ink)]" title="Dismiss" aria-label="Dismiss announcement">
            <svg {...iconProps} className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}