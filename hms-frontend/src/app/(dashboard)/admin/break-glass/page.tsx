"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtShortDateTime } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
import { EmptyState, ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Grant = {
  id: string; reason: string; created_at: string; expires_at: string; reviewed_at: string | null; review_outcome: "appropriate" | "inappropriate" | null; review_note: string | null;
  user?: { name: string }; patient?: { mrn: string; first_name: string; last_name: string };
};
type Page = { data: Grant[]; current_page: number; last_page: number };

export default function BreakGlassReviewPage() {
  const [status, setStatus] = useState<"unreviewed" | "all">("unreviewed");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useFetch<Page>("/admin/access-grants", { status, page });
  const [target, setTarget] = useState<Grant | null>(null);
  const [outcome, setOutcome] = useState<"appropriate" | "inappropriate">("appropriate");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  async function submit() {
    if (!target) return;
    setBusy(true);
    try { await api.put(`/admin/access-grants/${target.id}/review`, { outcome, note: note || undefined }); setTarget(null); setNote(""); setMsg({ kind: "success", text: "Review recorded." }); reload(); }
    catch (e) { setMsg({ kind: "error", text: apiError(e) }); setTarget(null); } finally { setBusy(false); }
  }

  return (
    <div className="animate-fade-up w-full">
      <PageHeader title="Emergency access review" subtitle="Every time a doctor opens a record outside their care team (“break the glass”) it lands here. Read the reason and decide whether it was appropriate." />
      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      <div role="group" aria-label="Filter" className="mb-4 inline-flex rounded-full border border-[var(--border)] bg-white p-1">
        {(["unreviewed", "all"] as const).map((f) => <button key={f} onClick={() => { setStatus(f); setPage(1); }} aria-pressed={status === f} className={`rounded-full px-4 py-1 text-sm font-medium capitalize ${status === f ? "bg-[var(--primary)] text-white" : "text-[var(--muted)]"}`}>{f === "unreviewed" ? "To review" : "All"}</button>)}
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <ListSkeleton rows={3} />
        : (data?.data ?? []).length === 0 ? <EmptyState title={status === "unreviewed" ? "Nothing to review" : "No emergency accesses yet"} hint="Doctors only appear here when they open a patient who is not under their care." />
        : (
          <ul className="space-y-3">
            {data?.data.map((g) => (
              <li key={g.id} className={`${cardCls} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading font-semibold"><b>{g.user?.name}</b> opened <b>{g.patient?.first_name} {g.patient?.last_name}</b> <span className="text-sm font-normal text-[var(--muted)]">({g.patient?.mrn})</span></p>
                    <p className="text-xs text-[var(--muted)]">{fmtShortDateTime(g.created_at)} · access until {fmtShortDateTime(g.expires_at)}</p>
                    <blockquote className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">“{g.reason}”</blockquote>
                    {g.reviewed_at && <p className="mt-2 text-xs"><span className={`rounded-full px-2.5 py-0.5 font-semibold ${g.review_outcome === "appropriate" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-800"}`}>{g.review_outcome}</span> <span className="text-[var(--muted)]">reviewed {fmtShortDateTime(g.reviewed_at)}{g.review_note ? ` · ${g.review_note}` : ""}</span></p>}
                  </div>
                  {!g.reviewed_at && <button onClick={() => { setTarget(g); setOutcome("appropriate"); setNote(""); }} className={btnPrimary}>Review</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      {data && data.last_page > 1 && <div className="mt-4 flex items-center justify-between text-sm"><button disabled={page === 1} onClick={() => setPage(page - 1)} className={btnGhost}>← Previous</button><span>Page {data.current_page} of {data.last_page}</span><button disabled={page === data.last_page} onClick={() => setPage(page + 1)} className={btnGhost}>Next →</button></div>}

      <Modal open={!!target} onClose={() => setTarget(null)} title="Review emergency access" footer={<><button onClick={() => setTarget(null)} className={btnGhost}>Cancel</button><button onClick={submit} disabled={busy} className={outcome === "inappropriate" ? btnDanger : btnPrimary}>{busy ? "Saving…" : "Save review"}</button></>}>
        {target && (
          <div className="space-y-4 text-sm">
            <p><b>{target.user?.name}</b> → {target.patient?.first_name} {target.patient?.last_name}</p>
            <blockquote className="rounded-xl bg-slate-50 p-3">“{target.reason}”</blockquote>
            <fieldset><legend className="mb-1.5 text-xs font-semibold">Outcome</legend>
              <div className="flex gap-4">{(["appropriate", "inappropriate"] as const).map((o) => <label key={o} className="flex cursor-pointer items-center gap-2 capitalize"><input type="radio" name="outcome" checked={outcome === o} onChange={() => setOutcome(o)} />{o}</label>)}</div></fieldset>
            <Field label={outcome === "inappropriate" ? "What follow-up is needed? (kept in the audit trail)" : "Note (optional)"}>{(p) => <textarea {...p} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />}</Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
