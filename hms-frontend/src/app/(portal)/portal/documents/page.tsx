"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiError, bytes, downloadFile, fmtShortDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";
import { useFetch } from "@/hooks/useFetch";
import { EmptyState, ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, btnDanger, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Doc = { id: string; title: string; original_name: string; mime_type: string; size: number; category: string; scan_status: string; created_at: string; uploaded_by: number; uploader?: { name: string } | null };

const CATS: Record<string, string> = { lab_report: "Lab report", imaging: "Imaging", prescription: "Prescription", insurance: "Insurance", id_document: "ID document", referral: "Referral letter", other: "Other" };
const MAX = 10 * 1024 * 1024;
const OK_EXT = ["pdf", "jpg", "jpeg", "png", "webp", "docx"];

export default function DocumentsPage() {
  const t = useT();
  const me = useAuthStore((s) => s.user);
  const { data, error, loading, reload } = useFetch<Doc[]>("/portal/documents");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [del, setDel] = useState<Doc | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    setErr("");
    if (!f) return setFile(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!OK_EXT.includes(ext)) { setFile(null); return setErr(`File type .${ext} is not allowed. Use ${OK_EXT.join(", ")}.`); }
    if (f.size > MAX) { setFile(null); return setErr("File is larger than 10 MB."); }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function upload() {
    if (!file || !title.trim()) return;
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.append("title", title.trim()); fd.append("category", category); fd.append("document", file);
    try {
      await api.post("/portal/documents", fd);
      setOpen(false); setFile(null); setTitle(""); setCategory("other");
      setFlash({ kind: "success", text: "Document uploaded. Your care team can now see it." });
      reload();
    } catch (e) {
      setErr(apiError(e, "Upload failed."));
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!del) return;
    try { await api.delete(`/portal/documents/${del.id}`); setFlash({ kind: "success", text: "Document deleted." }); reload(); }
    catch (e) { setFlash({ kind: "error", text: apiError(e) }); }
    setDel(null);
  }

  async function get(d: Doc) {
    try { await downloadFile(api, `/portal/documents/${d.id}`, d.original_name); }
    catch (e) { setFlash({ kind: "error", text: apiError(e, "Could not download this document.") }); }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("Documents")} subtitle="Upload reports, referral letters or insurance cards. They're stored privately and visible only to you and your treating doctors."
        actions={<button onClick={() => { setErr(""); setOpen(true); }} className={btnPrimary}>{t("Upload")} document</button>} />
      {flash && <div className="mb-4"><Notice kind={flash.kind}>{flash.text}</Notice></div>}

      {error ? <ErrorState message={error} onRetry={reload} />
        : loading && !data ? <ListSkeleton rows={3} />
        : (data ?? []).length === 0 ? <EmptyState title="No documents yet" hint="Upload a PDF or photo of a report, referral or insurance card to share it with your doctor." action={{ label: `${t("Upload")} document`, onClick: () => setOpen(true) }} />
        : (
          <div className={`${cardCls} overflow-x-auto`}>
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Your documents</caption>
              <thead className="border-b border-[var(--border)] text-xs text-[var(--muted)]"><tr>
                <th scope="col" className="px-5 py-3">Document</th><th scope="col" className="px-3 py-3">Type</th><th scope="col" className="px-3 py-3">Added</th><th scope="col" className="px-3 py-3">By</th><th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data?.map((d) => (
                  <tr key={d.id}>
                    <th scope="row" className="px-5 py-3 font-medium"><span className="block">{d.title}</span><span className="block text-xs font-normal text-[var(--muted)]">{d.original_name} · {bytes(d.size)}</span></th>
                    <td className="px-3 py-3">{CATS[d.category] ?? d.category}</td>
                    <td className="px-3 py-3">{fmtShortDate(d.created_at)}</td>
                    <td className="px-3 py-3">{d.uploaded_by === me?.id ? "You" : d.uploader?.name ?? "Clinic"}</td>
                    <td className="px-5 py-3"><div className="flex justify-end gap-2">
                      <button onClick={() => get(d)} className={btnGhost} aria-label={`${t("Download")} ${d.title}`}>{t("Download")}</button>
                      {d.uploaded_by === me?.id && <button onClick={() => setDel(d)} className={btnDanger} aria-label={`${t("Delete")} ${d.title}`}>{t("Delete")}</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={open} onClose={() => setOpen(false)} title="Upload a document"
        footer={<><button onClick={() => setOpen(false)} className={btnGhost}>{t("Cancel")}</button><button onClick={upload} disabled={!file || !title.trim() || busy} className={btnPrimary}>{busy ? "Uploading…" : t("Upload")}</button></>}>
        <div className="space-y-4">
          <Field label="File" hint="PDF, JPG, PNG, WEBP or DOCX, up to 10 MB. Files are checked on our server before they are accepted.">
            {(p) => <input {...p} ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" onChange={(e) => pick(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />}
          </Field>
          <Field label="Title">{(p) => <input {...p} value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} className={inputCls} />}</Field>
          <Field label="Type">{(p) => <select {...p} value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
          {err && <Notice kind="error">{err}</Notice>}
        </div>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete document?"
        footer={<><button onClick={() => setDel(null)} className={btnGhost}>{t("Cancel")}</button><button onClick={remove} className={btnDanger}>{t("Delete")}</button></>}>
        <p className="text-sm">“{del?.title}” will be permanently removed. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
