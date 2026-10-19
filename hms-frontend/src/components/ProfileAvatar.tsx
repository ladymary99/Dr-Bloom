"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ProfileAvatar({
  endpoint = "/me/avatar",
  name,
  className,
  refreshKey = 0,
}: {
  endpoint?: string;
  name: string;
  className: string;
  refreshKey?: number;
}) {
  const [src, setSrc] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("profile-avatar-updated", refresh);
    return () => window.removeEventListener("profile-avatar-updated", refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    api.get(endpoint, { responseType: "blob" })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        if (!cancelled) {
          setSrc(objectUrl);
          setLoadError(false);
        }
      })
      .catch((error: { response?: { status?: number } }) => {
        if (!cancelled && error.response?.status !== 404) setLoadError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [endpoint, refreshKey, revision]);

  return (
    <span className={`relative inline-flex flex-none items-center justify-center overflow-hidden ${className}`}
      title={loadError ? "Could not load profile photo" : name}>
      {src
        ? <img src={src} alt={`${name} profile`} className="h-full w-full object-cover" />
        : <span aria-hidden>{name.trim().charAt(0).toUpperCase() || "?"}</span>}
    </span>
  );
}
