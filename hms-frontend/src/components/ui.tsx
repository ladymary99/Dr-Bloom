"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { useT } from "@/lib/i18n";

/* ---------- shared class strings (keeps every page visually consistent) ---------- */
export const cardCls = "rounded-3xl border border-[var(--border)] bg-white shadow-sm";
export const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/70 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-tint)] disabled:bg-slate-50 disabled:text-slate-500";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--primary)]/20 transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--primary-tint)] hover:bg-[var(--primary-tint)]/20 disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50";

/* ---------- loading / error / empty ---------- */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const t = useT();
  return (
    <div role="status" aria-live="polite" aria-label={t("Loading")} className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${cardCls} flex items-center gap-4 p-5`}>
          <Skeleton className="h-11 w-11 flex-none rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
      <span className="sr-only">{t("Loading")}…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className={`${btnGhost} mt-3`}>
          {t("Try again")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className={`${cardCls} px-6 py-12 text-center`}>
      <p className="font-heading text-base font-semibold text-[var(--ink)]">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">{hint}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className={`${btnPrimary} mt-5`}>
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className={`${btnPrimary} mt-5`}>
            {action.label}
          </button>
        ))}
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "success" | "error" | "warn"; children: React.ReactNode }) {
  const map = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-800",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
  } as const;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${map[kind]}`}>
      {children}
    </div>
  );
}

/* ---------- status badges (all pairs meet WCAG AA) ---------- */
const BADGE: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Pending", cls: "bg-amber-100 text-amber-900" },
  confirmed: { label: "Confirmed", cls: "bg-blue-100 text-blue-900" },
  checked_in: { label: "Checked in", cls: "bg-indigo-100 text-indigo-900" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-900" },
  cancelled: { label: "Cancelled", cls: "bg-slate-200 text-slate-800" },
  no_show: { label: "No-show", cls: "bg-red-100 text-red-800" },
  pending: { label: "Unpaid", cls: "bg-amber-100 text-amber-900" },
  partial: { label: "Partially paid", cls: "bg-orange-100 text-orange-900" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-900" },
  refunded: { label: "Refunded", cls: "bg-slate-200 text-slate-800" },
  submitted: { label: "Submitted", cls: "bg-blue-100 text-blue-900" },
  in_review: { label: "In review", cls: "bg-amber-100 text-amber-900" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-800" },
  ordered: { label: "Ordered", cls: "bg-slate-200 text-slate-800" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-900" },
  succeeded: { label: "Paid", cls: "bg-emerald-100 text-emerald-900" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-800" },
  processing: { label: "Processing", cls: "bg-amber-100 text-amber-900" },
};

export function StatusBadge({ status, kind }: { status: string; kind?: "invoice" | "claim" }) {
  const t = useT();
  // "paid" means different things for an invoice and an insurer payout; keep the same badge but allow override
  const b = BADGE[status] ?? { label: status.replace(/_/g, " "), cls: "bg-slate-200 text-slate-800" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`} data-kind={kind}>
      {t(b.label)}
    </span>
  );
}

/* ---------- form field with a real <label> ---------- */
export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (p: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const descId = hint || error ? `${id}-d` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-[var(--ink)]">
        {label}
      </label>
      {children({ id, "aria-describedby": descId, "aria-invalid": error ? true : undefined })}
      {(hint || error) && (
        <p id={descId} className={`mt-1 text-xs ${error ? "text-red-700" : "text-[var(--muted)]"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/* ---------- accessible modal: Esc, focus trap, focus restore, scroll lock ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    (ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current?.querySelector<HTMLElement>(sel))?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>(sel));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`animate-fade-up flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 id={titleId} className="font-heading text-base font-semibold text-[var(--ink)]">
            {title}
          </h2>
          <button onClick={onClose} aria-label={t("Close")} className="flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-[var(--muted)] hover:bg-slate-100">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] bg-slate-50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- tabs with roving keyboard support ---------- */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  function onKey(e: React.KeyboardEvent, i: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm [scrollbar-width:none]">
      {tabs.map((tb, i) => (
        <button
          key={tb.id}
          ref={(el) => {
            refs.current[tb.id] = el;
          }}
          role="tab"
          id={`tab-${tb.id}`}
          aria-selected={value === tb.id}
          aria-controls={`panel-${tb.id}`}
          tabIndex={value === tb.id ? 0 : -1}
          onClick={() => onChange(tb.id)}
          onKeyDown={(e) => onKey(e, i)}
          className={`flex-none rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
            value === tb.id ? "bg-[var(--primary)] text-white shadow" : "text-[var(--muted)] hover:bg-[var(--primary-tint)]/25 hover:text-[var(--primary)]"
          }`}
        >
          {tb.label}
          {tb.count !== undefined && tb.count > 0 && (
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${value === tb.id ? "bg-white/20" : "bg-[var(--primary-tint)]/40"}`}>{tb.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-[var(--ink)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, className = "h-11 w-11" }: { name: string; className?: string }) {
  const initials = name.replace(/^Dr\.?\s*/i, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span aria-hidden className={`flex flex-none items-center justify-center rounded-2xl bg-[var(--primary-tint)]/40 font-heading text-sm font-semibold text-[var(--primary)] ${className}`}>
      {initials || "?"}
    </span>
  );
}
