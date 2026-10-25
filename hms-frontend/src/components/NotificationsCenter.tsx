"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { apiError, fmtDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n";
import Icon from "@/components/icons";
import { TYPE_ICON } from "@/components/NotificationBell";
import { EmptyState, ErrorState, ListSkeleton, PageHeader, btnGhost, cardCls } from "@/components/ui";

type Notif = { id: string; data: { type?: string; message?: string; link?: string }; read_at: string | null; created_at: string };

/** Full-page notifications center (shared by patient portal and staff dashboard). */
export default function NotificationsCenter() {
  const t = useT();
  const router = useRouter();
  const [items, setItems] = useState<Notif[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { params: { limit: 100 } });
      setItems(data);
      setError("");
    } catch (e) {
      setError(apiError(e));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function open(n: Notif) {
    if (!n.read_at) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {});
      setItems((cur) => cur?.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)) ?? cur);
    }
    if (n.data.link) router.push(n.data.link);
  }

  async function markAll() {
    await api.post("/notifications/read-all").catch(() => {});
    const now = new Date().toISOString();
    setItems((cur) => cur?.map((i) => ({ ...i, read_at: i.read_at ?? now })) ?? cur);
  }

  const shown = (items ?? []).filter((n) => filter === "all" || !n.read_at);
  const unread = (items ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={t("Notifications")}
        subtitle={unread ? `${unread} unread` : "You're all caught up."}
        actions={unread > 0 ? <button onClick={markAll} className={btnGhost}>{t("Mark all read")}</button> : undefined}
      />
      <div role="group" aria-label="Filter" className="mb-4 inline-flex rounded-xl bg-white p-1 shadow-sm">
        {(["all", "unread"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${filter === f ? "bg-[var(--primary)] text-white" : "text-[var(--muted)]"}`}>
            {f === "all" ? "All" : "Unread"}
          </button>
        ))}
      </div>

      {error ? <ErrorState message={error} onRetry={load} />
        : !items ? <ListSkeleton rows={4} />
        : shown.length === 0 ? <EmptyState title={filter === "unread" ? "No unread notifications" : t("No notifications yet.")} hint="Appointment updates, messages, results and payments will appear here." />
        : (
          <ul className={`${cardCls} divide-y divide-[var(--border)] overflow-hidden`}>
            {shown.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-[var(--primary-tint)]/10 ${n.read_at ? "" : "bg-[var(--primary-tint)]/10"}`}>
                  <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--primary-tint)]/30 text-[var(--primary)]">
                    <Icon name={TYPE_ICON[n.data.type ?? ""] ?? "announcements"} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm text-[var(--ink)] ${n.read_at ? "" : "font-semibold"}`}>{n.data.message}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{fmtDateTime(n.created_at)}</span>
                  </span>
                  {!n.read_at && <span aria-label="Unread" className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-[var(--primary)]" />}
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
