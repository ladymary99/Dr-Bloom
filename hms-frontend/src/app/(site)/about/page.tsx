import Link from "next/link";

const values = [
  { icon: "💙", title: "Patient first", text: "Every decision starts with what is best for the patient." },
  { icon: "🔬", title: "Evidence-based", text: "Modern diagnostics and treatments, continuously updated." },
  { icon: "🤝", title: "Transparency", text: "Clear billing, online records, and honest communication." },
  { icon: "🛡️", title: "Safety", text: "Strict protocols, audited access, and encrypted patient data." },
];

export default function AboutPage() {
  return (
    <div>
      <section className="bg-gradient-to-b from-blue-50/60 to-white px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">About Dr-Bloom Hospital</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Founded on a simple idea: a hospital should run as one connected system — so patients spend
          less time waiting and more time healing.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Our story</h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Dr-Bloom began as a small clinic and has grown into a full-service hospital — emergency,
              outpatient, laboratory, pharmacy, and inpatient wards — powered entirely by our own
              hospital management system.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              Because our doctors, nurses, lab, and pharmacy share one live system, your records follow
              you everywhere in the hospital. No lost files, no repeated questions, no surprises on your bill.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { v: "2019", l: "Founded" },
              { v: "80+", l: "Staff members" },
              { v: "5,000+", l: "Patients treated" },
              { v: "24/7", l: "Always open" },
            ].map((s) => (
              <div key={s.l} className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{s.v}</div>
                <div className="mt-1 text-sm text-slate-500">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-slate-900">Our values</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-2xl">{v.icon}</div>
                <h3 className="mt-3 font-semibold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Come see us</h2>
        <Link href="/contact" className="mt-5 inline-block rounded-full bg-blue-600 px-7 py-3 font-medium text-white hover:bg-blue-700">
          Contact us
        </Link>
      </section>
    </div>
  );
}