"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui";

/** Doctor photo behind auth: fetched as a blob with the Bearer token, falls back to initials. */
export default function DoctorAvatar({ id, name, hasPhoto, className = "h-14 w-14" }: { id: number; name: string; hasPhoto: boolean; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPhoto) return;
    let url: string | null = null;
    let alive = true;
    api
      .get(`/portal/doctors/${id}/photo`, { responseType: "blob" })
      .then((r) => {
        if (!alive) return;
        url = URL.createObjectURL(r.data);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, hasPhoto]);

  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={name} className={`${className} flex-none rounded-2xl object-cover`} /> : <Avatar name={name} className={className} />;
}
