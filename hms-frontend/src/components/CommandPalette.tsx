"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { PatientLookupModal } from "@/components/BreakGlass";

type Page = { href: string; label: string; perm?: string; role?: string };
type Hit = { kind: "page" | "patient" | "lookup"; label: string; sub?: string; href?: string };
type P = { id: string; first_name: string; last_name: string; mrn: string };

const PAGES: Page[] = [
  { href: "/dashboard", label: "Dashboard" }, { href: "/patients", label: "Patients", perm: "view patients" }, { href: "/appointments", label: "Appointments", perm: "manage appointments" },
  { href: "/doctor/queue", label: "My queue", perm: "conduct visits" }, { href: "/doctor/availability", label: "My schedule", perm: "conduct visits" }, { href: "/messages", label: "Messages" },
  { href: "/beds", label: "Wards & beds" }, { href: "/lab", label: "Laboratory", perm: "manage lab" }, { href: "/pharmacy", label: "Pharmacy", perm: "manage pharmacy" },
  { href: "/payments", label: "Payments", perm: "manage payments" }, { href: "/claims", label: "Insurance claims", perm: "manage payments" }, { href: "/notifications", label: "Notifications" }, { href: "/profile", label: "My profile" },
  { href: "/admin/break-glass", label: "Emergency access review", role: "admin" }, { href: "/admin/privacy-requests", label: "Privacy requests", role: "admin" }, { href: "/admin/audit-logs", label: "Audit logs", role: "admin" },
];

/** Ctrl/⌘+K: jump to any page or open a patient's chart. */
export default function CommandPalette() {
  const router = useRouter();
  const { roles, hasPermission } = useAuthStore();
  const restricted = roles.includes("doctor") && !roles.includes("admin");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState<P[]>([]);
  const [active, setActive] = useState(0);
  const [lookup, setLookup] = useState(false);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the palette each time it opens
  useEffect(() => { if (open) { setQ(""); setPatients([]); setActive(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale results when the query becomes too short
    if (!open || q.trim().length < 2 || !hasPermission("view patients")) { setPatients([]); return; }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try { const { data } = await api.get("/patients", { params: { search: q.trim() } }); if (id === seq.current) setPatients(data.data.slice(0, 6)); } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, hasPermission]);

  const hits: Hit[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pages = PAGES.filter((p) => (!p.perm || hasPermission(p.perm)) && (!p.role || roles.includes(p.role)) && (!term || p.label.toLowerCase().includes(term)))
      .slice(0, term ? 5 : 8).map((p): Hit => ({ kind: "page", label: p.label, href: p.href }));
    const pts = patients.map((p): Hit => ({ kind: "patient", label: `${p.first_name} ${p.last_name}`, sub: p.mrn, href: `/patients/${p.id}` }));
    const extra: Hit[] = restricted && term.length >= 2 ? [{ kind: "lookup", label: "Not under your care? Find any patient…" }] : [];
    return [...pts, ...pages, ...extra];
  }, [q, patients, hasPermission, roles, restricted]);

  function go(h: Hit) {
    setOpen(false);
    if (h.kind === "lookup") setLookup(true);
    else if (h.href) router.push(h.href);
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && hits[active]) { e.preventDefault(); go(hits[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <>
      {open && (
        <div className="no-print fixed inset-0 z-[70] flex items-start justify-center bg-slate-900/50 p-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <input ref={input} role="combobox" aria-expanded aria-controls={listId} aria-autocomplete="list" aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined}
              value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey} placeholder="Search patients or pages…" className="w-full border-b border-[var(--border)] px-5 py-4 text-base outline-none" />
            <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
              {hits.length === 0 && <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">Nothing found.</li>}
              {hits.map((h, i) => (
                <li key={`${h.kind}-${h.label}-${i}`} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); go(h); }}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ${i === active ? "bg-[var(--primary-tint)]/30" : ""}`}>
                  <span className="min-w-0 truncate"><span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">{h.kind === "patient" ? "Patient" : h.kind === "page" ? "Page" : "Emergency"}</span>{h.label}</span>
                  {h.sub && <span className="flex-none text-xs text-[var(--muted)]">{h.sub}</span>}
                </li>
              ))}
            </ul>
            <p className="border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--muted)]">↑↓ to move · Enter to open · Esc to close · Ctrl+Shift+L to lock the screen</p>
          </div>
        </div>
      )}
      <PatientLookupModal open={lookup} onClose={() => setLookup(false)} />
    </>
  );
}
