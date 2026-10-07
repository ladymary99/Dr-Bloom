"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Info = { hospital_name: string; address: string; phone: string; email: string; working_hours: string };

export default function ContactPage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  useEffect(() => {
    api.get("/public/info").then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  const inputCls = "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <div>
      <section className="bg-gradient-to-b from-blue-50/60 to-white px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Contact us</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">Questions, appointments, or emergencies — we&apos;re here.</p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-20 lg:grid-cols-2">
        <div className="space-y-4">
          {[
            { icon: "📍", label: "Address", value: info?.address || "—" },
            { icon: "📞", label: "Phone", value: info?.phone || "—" },
            { icon: "✉️", label: "Email", value: info?.email || "—" },
            { icon: "🕐", label: "Working hours", value: info?.working_hours || "24/7 emergency" },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <span className="text-2xl">{c.icon}</span>
              <div>
                <div className="text-sm font-medium text-slate-900">{c.label}</div>
                <div className="mt-0.5 text-sm text-slate-600">{c.value}</div>
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            🚑 Medical emergency? Come straight to the ER or call {info?.phone || "our emergency line"} — no appointment needed.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7">
          <h2 className="font-semibold text-slate-900">Send a message</h2>
          {sent ? (
            <div className="mt-6 rounded-xl bg-green-50 px-4 py-6 text-center text-sm text-green-700">
              ✓ Message received. For urgent matters, please call us directly.
            </div>
          ) : (
            <form className="mt-5 space-y-4"
              onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <input required placeholder="Your name" className={inputCls} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input required type="email" placeholder="Your email" className={inputCls} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <textarea required rows={5} placeholder="How can we help?" className={inputCls} value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <button className="w-full rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                Send message
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}