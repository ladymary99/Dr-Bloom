"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiError } from "@/lib/format";
import { btnGhost, btnPrimary } from "@/components/ui";

/**
 * "Start visit" / "Resume visit". The server creates (or resumes) the draft note and moves the
 * appointment to "in consultation", so opening the screen by URL alone never starts anything.
 */
export default function StartVisitButton({
  appointmentId, patientId, visitId, ghost, label, onError,
}: { appointmentId?: string; patientId: string; visitId?: string | null; ghost?: boolean; label?: string; onError?: (m: string) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (visitId) return router.push(`/doctor/visit/${visitId}`);
    setBusy(true);
    try {
      const { data } = await api.post("/visits", { patient_id: patientId, appointment_id: appointmentId });
      router.push(`/doctor/visit/${data.visit.id}`);
    } catch (e) {
      onError?.(apiError(e, "Could not start the visit."));
      setBusy(false);
    }
  }

  return (
    <button onClick={go} disabled={busy} className={ghost ? btnGhost : btnPrimary}>
      {busy ? "Opening…" : label ?? (visitId ? "Resume visit" : "Start visit")}
    </button>
  );
}
