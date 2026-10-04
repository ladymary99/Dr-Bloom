"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type QueueItem = {
  id: string;
  appointment_at: string;
  status: string;
  reason: string | null;
  patient: {
    mrn: string; first_name: string; last_name: string;
    date_of_birth: string; gender: string; blood_type: string | null; allergies: string | null;
  } | null;
  department: { name: string } | null;
};

const statusPill: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-blue-50 text-blue-700",
  checked_in: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
  no_show: "bg-red-50 text-red-600",
};

function age(dob: string) {
  return Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10);
}

export default function DoctorQueuePage() {
  const router = useRouter();
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    const { data } = await api.get("/doctor/queue", { params: { date: d } });
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const waiting = items?.filter((i) => ["scheduled", "confirmed", "checked_in"].includes(i.status)) ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items ? `${waiting.length} waiting · ${items.length} total today` : "Loading…"}
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading…</div>
        ) : !items?.length ? (
          <div className="p-12 text-center text-slate-500">No appointments this day.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Info</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium tabular-nums text-slate-900">
                    {new Date(a.appointment_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">{a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "—"}</div>
                    <div className="text-xs text-blue-700">{a.patient?.mrn}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {a.patient ? `${age(a.patient.date_of_birth)}y · ${a.patient.gender}` : "—"}
                    {a.patient?.blood_type && <span className="ml-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700">{a.patient.blood_type}</span>}
                    {a.patient?.allergies && <div className="mt-1 text-red-600">⚠ {a.patient.allergies}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{a.reason ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusPill[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {a.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {["scheduled", "confirmed", "checked_in"].includes(a.status) && (
                      <button
                        onClick={() => router.push(`/doctor/consult/${a.id}`)}
                        className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Consult →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}