"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";
import { ErrorState, ListSkeleton, btnGhost } from "@/components/ui";

/** Legacy link target (queue, dashboard). Starts or resumes the visit for this appointment, then opens the encounter. */
export default function ConsultRedirect() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;   // StrictMode runs effects twice in dev; start only once
    started.current = true;
    api.post("/visits", { appointment_id: appointmentId })
      .then(({ data }) => router.replace(`/doctor/visit/${data.visit.id}`))
      .catch((e) => setError(apiError(e, "Could not open this visit.")));
  }, [appointmentId, router]);

  return error
    ? <div className="mx-auto max-w-xl space-y-4"><ErrorState message={error} /><Link href="/dashboard" className={btnGhost}>Back to my day</Link></div>
    : <div className="mx-auto max-w-xl"><ListSkeleton rows={2} /></div>;
}
