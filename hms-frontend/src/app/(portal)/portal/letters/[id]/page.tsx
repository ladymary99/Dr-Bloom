"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useFetch } from "@/hooks/useFetch";
import LetterSheet, { type LetterData } from "@/components/LetterSheet";
import { ErrorState, ListSkeleton, btnGhost, btnPrimary } from "@/components/ui";

export default function PortalLetterPrint() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useFetch<LetterData>(`/portal/letters/${id}`);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap justify-between gap-2">
        <Link href="/portal/records" className={btnGhost}>← Back to records</Link>
        <button onClick={() => window.print()} className={btnPrimary}>Print / Save as PDF</button>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <ListSkeleton rows={2} /> : <LetterSheet l={data} />}
    </div>
  );
}
