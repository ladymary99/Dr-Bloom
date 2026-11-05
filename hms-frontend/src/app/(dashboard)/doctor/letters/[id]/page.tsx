"use client";

import { useParams } from "next/navigation";
import { useFetch } from "@/hooks/useFetch";
import LetterSheet, { type LetterData } from "@/components/LetterSheet";
import { ErrorState, ListSkeleton, btnGhost, btnPrimary } from "@/components/ui";

export default function StaffLetterPrint() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useFetch<LetterData>(`/letters/${id}`);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap justify-between gap-2">
        <button onClick={() => window.close()} className={btnGhost}>Close</button>
        <button onClick={() => window.print()} className={btnPrimary}>Print / Save as PDF</button>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <ListSkeleton rows={2} /> : <LetterSheet l={data} />}
    </div>
  );
}
