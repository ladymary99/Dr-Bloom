"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import ProfileAvatar from "@/components/ProfileAvatar";
import { useAuthStore } from "@/store/auth";

type PatientDocument = {
  id: string;
  uploaded_by: number;
  title: string;
  original_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  uploader?: { name: string } | null;
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function PatientFiles({
  basePath,
  patientName,
  canDelete = false,
}: {
  basePath: string;
  patientName: string;
  canDelete?: boolean;
}) {
  const user = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchDocuments = useCallback(async () => {
    const { data } = await api.get<PatientDocument[]>(`${basePath}/documents`);
    return data;
  }, [basePath]);

  useEffect(() => {
    let cancelled = false;
    fetchDocuments()
      .then((data) => {
        if (!cancelled) setDocuments(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load patient documents.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchDocuments]);

  async function refreshDocuments() {
    setError("");
    try {
      setDocuments(await fetchDocuments());
    } catch {
      setError("Could not refresh patient documents.");
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setError("");
    setMessage("");
    setSaving(true);
    const form = new FormData();
    form.append("title", title.trim() || file.name);
    form.append("document", file);
    const formElement = event.currentTarget;
    try {
      await api.post(`${basePath}/documents`, form);
      setTitle("");
      setFile(null);
      formElement.reset();
      setMessage("Document uploaded.");
      await refreshDocuments();
    } catch (requestError) {
      const data = (requestError as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      setError(data?.errors ? Object.values(data.errors).flat()[0] : data?.message ?? "Could not upload document.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto() {
    if (!photo) return;
    setError("");
    setMessage("");
    setSaving(true);
    const form = new FormData();
    form.append("photo", photo);
    try {
      await api.post(`${basePath}/photo`, form);
      setPhoto(null);
      setPhotoKey((key) => key + 1);
      window.dispatchEvent(new Event("profile-avatar-updated"));
      setMessage("Patient profile photo updated.");
    } catch (requestError) {
      const data = (requestError as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
      setError(data?.errors ? Object.values(data.errors).flat()[0] : data?.message ?? "Could not update patient photo.");
    } finally {
      setSaving(false);
    }
  }

  async function download(document: PatientDocument) {
    try {
      const { data } = await api.get(`${basePath}/documents/${document.id}`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.original_name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not download this document.");
    }
  }

  async function remove(document: PatientDocument) {
    if (!confirm(`Delete "${document.title}"?`)) return;
    setError("");
    try {
      await api.delete(`${basePath}/documents/${document.id}`);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch {
      setError("Could not delete this document.");
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h3 className="font-semibold text-slate-900">Patient photo & documents</h3>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ProfileAvatar endpoint={`${basePath}/photo`} name={patientName} className="h-16 w-16 rounded-full bg-blue-50 font-semibold text-blue-700" refreshKey={photoKey} />
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose patient profile photo"
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-xs text-slate-600" />
          <button type="button" onClick={uploadPhoto} disabled={!photo || saving}
            className="rounded-full bg-blue-700 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
            Upload photo
          </button>
        </div>
      </div>

      <form onSubmit={uploadDocument} className="mt-5 grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title (optional)" className={inputClass} />
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)} className={`${inputClass} file:mr-2 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-blue-700`} />
        <button type="submit" disabled={!file || saving}
          className="rounded-full bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {saving ? "Uploading…" : "Upload document"}
        </button>
      </form>
      <p className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, DOC, or DOCX · max 10 MB. Photos max 5 MB.</p>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <div className="mt-4 border-t border-slate-200 pt-3">
        <h4 className="text-sm font-medium text-slate-800">Uploaded documents</h4>
        {loading ? <p className="py-4 text-sm text-slate-500">Loading documents…</p>
          : documents.length === 0 ? <p className="py-4 text-sm text-slate-500">No documents uploaded yet.</p>
            : <ul className="mt-2 divide-y divide-slate-100">
              {documents.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{document.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {document.original_name} · {new Date(document.created_at).toLocaleDateString()}
                      {document.uploader?.name ? ` · ${document.uploader.name}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => download(document)} className="text-xs font-medium text-blue-700 hover:underline">Download</button>
                  {canDelete && (roles.includes("admin") || document.uploaded_by === user?.id) &&
                    <button type="button" onClick={() => remove(document)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>}
                </li>
              ))}
            </ul>}
      </div>
    </section>
  );
}
