"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Announcement = { id: number; title: string; body: string };

export default function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    api.get("/announcements").then((r) => setItems(r.data)).catch(() => {});
    try {
      setDismissed(JSON.parse(localStorage.getItem("dismissed-announcements") ?? "[]"));
    } catch {
      setDismissed([]);
    }
  }, []);

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
        <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5">
          <span className="text-lg">📢</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">{a.title}</div>
            <div className="mt-0.5 text-sm text-slate-600">{a.body}</div>
          </div>
          <button onClick={() => dismiss(a.id)} className="flex-none text-slate-400 transition hover:text-slate-700" title="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}