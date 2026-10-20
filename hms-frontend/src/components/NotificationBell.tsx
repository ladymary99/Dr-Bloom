"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Icon, { type IconName } from "@/components/icons";

type Notif = {
  id: string;
  data: { type?: string; message?: string; link?: string };
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const TYPE_ICON: Record<string, IconName> = {
  appointment_booked: "appointments",
  appointment_reminder: "appointments",
  new_patient: "patients",
  payment: "payments",
  announcement: "announcements",
};

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const unread = items.filter((n) => !n.read_at).length;

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data);
      setError("");
    } catch {
      setError("Could not load notifications.");
    }
  }, []);

  useEffect(() => {
    // Fetching notifications and updating UI state is the purpose of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(t);
  }, [load]);

  async function openItem(n: Notif) {
    setOpen(false);
    if (!n.read_at) {
      try {
        await api.post(`/notifications/${n.id}/read`);
        setItems((cur) => cur.map((item) => item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item));
      } catch {
        setError("Could not mark this notification as read.");
      }
    }
    if (n.data.link) router.push(n.data.link);
  }

  async function markAllRead() {
    try {
      await api.post("/notifications/read-all");
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
      setError("");
    } catch {
      setError("Could not mark notifications as read.");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label="Notifications"
        className={`relative flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--muted)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--primary-tint)]/30 hover:text-[var(--primary)] ${open ? "bg-[var(--primary-tint)]/40 text-[var(--primary)]" : ""}`}
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-fade-up absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl shadow-[var(--primary)]/15">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="font-heading text-sm font-semibold text-[var(--ink)]">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-xs font-medium text-[var(--primary)] hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
            <ul className="max-h-80 divide-y divide-[var(--border)]/60 overflow-y-auto">
              {items.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-[var(--muted)]">No notifications yet.</li>
              )}
              {items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => openItem(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--primary-tint)]/10 ${n.read_at ? "opacity-60" : ""}`}>
                    <span className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full ${n.read_at ? "bg-[var(--primary-tint)]/10 text-[var(--muted)]" : "bg-[var(--primary-tint)]/25 text-[var(--primary)]"}`}>
                      <Icon name={TYPE_ICON[n.data.type ?? ""] ?? "announcements"} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs leading-snug text-[var(--ink)]">{n.data.message}</span>
                      <span className="mt-0.5 block text-[10px] tabular-nums text-[var(--muted)]">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[var(--primary)]" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}