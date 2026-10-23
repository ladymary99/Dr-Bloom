"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";

export default function AvatarUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await api.post("/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // ProfileAvatar listens for this — every circle updates instantly
      window.dispatchEvent(new Event("profile-avatar-updated"));
    } catch {
      setError("Upload failed. Use JPG, PNG or WebP under 5 MB.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/20 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {uploading ? "Uploading…" : "Upload profile photo"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}