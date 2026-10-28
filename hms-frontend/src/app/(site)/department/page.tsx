"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Dept = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  services?: string[];
  open24?: boolean;
};

/* Full hospital department list. Shown with the API data: any department the API
   does not return yet is filled in from here (matched by code or name). */
const fallbackDepts: Dept[] = [
  { id: 1, name: "Cardiology", code: "CAR", services: ["ECG & Echo", "Stress tests", "Heart clinic"], description: "Comprehensive heart and cardiovascular care — from routine ECGs and stress tests to long-term management of blood pressure, cholesterol and heart disease." },
  { id: 2, name: "Neurology", code: "NEU", services: ["Migraine care", "Epilepsy", "Stroke recovery"], description: "Expert diagnosis and treatment of neurological conditions, including migraines, epilepsy, stroke recovery and disorders of the brain, spine and nervous system." },
  { id: 3, name: "Pediatrics", code: "PED", services: ["Newborn care", "Vaccination", "Growth checks"], description: "Specialized healthcare for children and adolescents — newborn checks, vaccinations, growth tracking and treatment of childhood illnesses in a child-friendly setting." },
  { id: 4, name: "Orthopedics", code: "ORT", services: ["Fractures", "Joint care", "Sports injuries"], description: "Bone, joint, muscle and movement care — fracture treatment, arthritis management, sports injuries and post-surgery rehabilitation with modern physiotherapy." },
  { id: 5, name: "Emergency Medicine", code: "EMR", open24: true, services: ["Rapid triage", "Trauma care", "Resuscitation"], description: "24/7 urgent and emergency medical care with rapid triage, resuscitation, trauma response and a coordinated team ready around the clock, every day of the year." },
  { id: 6, name: "Radiology & Imaging", code: "RAD", services: ["X-ray", "Ultrasound", "CT scan"], description: "Advanced diagnostic imaging and medical scans — X-ray, ultrasound and CT, read by specialist radiologists with results delivered to your portal the same day." },
  { id: 7, name: "Internal Medicine", code: "INT", services: ["Adult checkups", "Chronic illness", "Second opinions"], description: "Whole-adult care for diagnosis and long-term management of conditions like hypertension, infections and chronic disease, coordinating other specialists when needed." },
  { id: 8, name: "General Surgery", code: "SUR", services: ["Day surgery", "Minimally invasive", "Pre & post-op care"], description: "Safe, modern surgical care — from day-case procedures to complex operations — with a full pre-operative assessment and a clear recovery plan after surgery." },
  { id: 9, name: "Obstetrics & Gynecology", code: "OBG", services: ["Antenatal care", "Delivery", "Women's health"], description: "Complete care for women at every stage — antenatal checks, safe delivery, postnatal support, family planning and treatment of gynecological conditions." },
  { id: 10, name: "Oncology", code: "ONC", services: ["Cancer screening", "Chemotherapy", "Support care"], description: "Compassionate cancer care from early screening and diagnosis to chemotherapy, treatment planning and supportive care, guided by a multidisciplinary team." },
  { id: 11, name: "Intensive Care (ICU)", code: "ICU", open24: true, services: ["Life support", "24/7 monitoring", "Critical care"], description: "Round-the-clock care for critically ill patients with advanced monitoring, life support and a dedicated team of intensive care specialists and nurses." },
  { id: 12, name: "Laboratory & Pathology", code: "LAB", services: ["Blood tests", "Same-day results", "Pathology"], description: "Accurate laboratory testing on modern analyzers — blood work, urine tests and pathology — with verified results sent straight to your patient portal." },
  { id: 13, name: "Gastroenterology", code: "GAS", services: ["Endoscopy", "Liver care", "Digestive health"], description: "Diagnosis and treatment of stomach, bowel and liver conditions, including endoscopy, acid reflux, gastritis, hepatitis and other digestive disorders." },
  { id: 14, name: "Pulmonology", code: "PUL", services: ["Asthma care", "Lung function tests", "Sleep apnea"], description: "Care for lung and breathing conditions such as asthma, COPD, chronic cough and infections, with lung function testing and ongoing treatment plans." },
  { id: 15, name: "Nephrology & Dialysis", code: "NEP", services: ["Kidney care", "Dialysis", "Transplant follow-up"], description: "Specialist kidney care — from early detection and treatment of kidney disease to dialysis sessions and follow-up after transplant." },
  { id: 16, name: "Urology", code: "URO", services: ["Kidney stones", "Prostate care", "Urinary health"], description: "Treatment of urinary tract and male reproductive conditions, including kidney stones, infections, prostate problems and minimally invasive procedures." },
  { id: 17, name: "Endocrinology & Diabetes", code: "END", services: ["Diabetes care", "Thyroid", "Hormone disorders"], description: "Management of diabetes, thyroid and hormone disorders with regular monitoring, nutrition guidance and personalized long-term treatment plans." },
  { id: 18, name: "Dermatology", code: "DER", services: ["Skin conditions", "Allergy care", "Skin checks"], description: "Care for skin, hair and nail conditions — acne, eczema, infections, allergies and skin checks — for children and adults." },
  { id: 19, name: "ENT (Ear, Nose & Throat)", code: "ENT", services: ["Hearing tests", "Sinus care", "Throat care"], description: "Diagnosis and treatment of ear, nose and throat problems, including hearing loss, sinus infections, tonsil issues and voice disorders." },
  { id: 20, name: "Ophthalmology", code: "OPH", services: ["Eye exams", "Cataract care", "Vision tests"], description: "Complete eye care — vision testing, eye exams, cataract assessment, glaucoma screening and treatment of eye infections and injuries." },
  { id: 21, name: "Psychiatry & Mental Health", code: "PSY", services: ["Counseling", "Therapy", "Medication review"], description: "Confidential support for anxiety, depression, stress and other mental health needs, with counseling, therapy and carefully monitored treatment." },
  { id: 22, name: "Dental Care", code: "DEN", services: ["Checkups", "Fillings", "Oral surgery"], description: "General and specialist dental care for the whole family — checkups, cleaning, fillings, extractions and treatment of gum disease." },
  { id: 23, name: "Physiotherapy & Rehabilitation", code: "PHY", services: ["Post-surgery rehab", "Pain relief", "Mobility training"], description: "Guided recovery after injury, surgery or illness with physiotherapy, pain management and exercise programs to restore movement and strength." },
  { id: 24, name: "Pharmacy", code: "PHR", services: ["Prescriptions", "Medication advice", "In-house dispensing"], description: "On-site pharmacy for prescriptions sent from your doctor through the portal, with medication advice from qualified pharmacists." },
];

const defaultServices = ["Consultations", "Diagnostics", "Follow-up care"];

const norm = (s: string) => s.toLowerCase().trim();

/* real SVG icons per department (like the image) */
const iconProps = {
  className: "h-7 w-7",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
} as const;

/* [keywords matched against the department name, icon] — first match wins */
const deptIcons: [string[], React.ReactNode][] = [
  [["cardio"], <svg key="cardio" {...iconProps}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/><path d="M7 12h3l1.5-3 2 5L15 12h2"/></svg>],
  [["neuro"], <svg key="neuro" {...iconProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>],
  [["pediat", "paediat", "child"], <svg key="ped" {...iconProps}><circle cx="12" cy="8" r="4"/><path d="M6 21v-1a6 6 0 0 1 12 0v1"/></svg>],
  [["ortho"], <svg key="ortho" {...iconProps}><path d="M17 10c.7-.7 1.7-1 2.5-.5a2.5 2.5 0 1 0-3-3c-.5-.8-.2-1.8.5-2.5a2.5 2.5 0 1 0-3 3L7 14c-.7.7-1.7 1-2.5.5a2.5 2.5 0 1 0 3 3c.5.8.2 1.8-.5 2.5a2.5 2.5 0 1 0 3-3z"/></svg>],
  [["intensive", "icu"], <svg key="icu" {...iconProps}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M5 10h3l2-3 3 6 2-3h4"/></svg>],
  [["emer"], <svg key="emer" {...iconProps}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12h8"/></svg>],
  [["radio", "imaging"], <svg key="radio" {...iconProps}><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></svg>],
  [["lab", "patholog"], <svg key="lab" {...iconProps}><path d="M10 2v6.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 8.5V2M8.5 2h7M7 16h10"/></svg>],
  [["onco", "cancer"], <svg key="onco" {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>],
  [["women", "obstet", "gyn"], <svg key="women" {...iconProps}><circle cx="12" cy="8" r="5"/><path d="M12 13v8M9 18h6"/></svg>],
  [["surg"], <svg key="surg" {...iconProps}><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z"/><path d="m8.8 12 2.2 2.2 4.2-4.7"/></svg>],
  [["internal", "general med"], <svg key="internal" {...iconProps}><path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>],
  [["gastro", "nutri"], <svg key="gastro" {...iconProps}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>],
  [["pulmo", "respir", "chest"], <svg key="pulmo" {...iconProps}><path d="M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2"/></svg>],
  [["nephro", "dialysis", "urolog", "kidney"], <svg key="nephro" {...iconProps}><path d="M12 2.7s7 6.3 7 11.3a7 7 0 0 1-14 0c0-5 7-11.3 7-11.3z"/></svg>],
  [["endocrin", "diabet"], <svg key="endo" {...iconProps}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></svg>],
  [["dermat", "skin"], <svg key="derm" {...iconProps}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>],
  [["ear, nose", "ent", "otolaryn"], <svg key="ent" {...iconProps}><path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4"/></svg>],
  [["ophthal", "eye"], <svg key="eye" {...iconProps}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>],
  [["psych", "mental"], <svg key="psych" {...iconProps}><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>],
  [["dental", "dentist"], <svg key="dental" {...iconProps}><path d="M12 5.5c-1.5-1.3-4-1.8-5.5-.3C5 6.7 5 9 5.8 11c.7 1.8 1 4 1.4 6 .3 1.5 1.3 2.5 2.3 2.5 1.2 0 1.3-2 2.5-2s1.3 2 2.5 2c1 0 2-1 2.3-2.5.4-2 .7-4.2 1.4-6 .8-2 .8-4.3-.7-5.8-1.5-1.5-4-1-5.5.3z"/></svg>],
  [["physio", "rehab"], <svg key="physio" {...iconProps}><circle cx="12" cy="5" r="2"/><path d="M5 9l7 2 7-2M12 11v5l-3 5M12 16l3 5"/></svg>],
  [["pharmac"], <svg key="pharm" {...iconProps}><path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z"/><path d="m8.5 8.5 7 7"/></svg>],
];

function iconFor(name: string) {
  const n = name.toLowerCase();
  for (const [keys, icon] of deptIcons) {
    if (keys.some((k) => n.includes(k))) return icon;
  }
  return deptIcons[0][1]; // heart fallback
}

export default function ServicesPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    api.get("/departments").then((r) => setDepts(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* threshold 0: the section is now very tall, so it must reveal as soon as it enters */
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* API departments first, then any department from the full list the API doesn't have */
  const list: Dept[] = [
    ...depts,
    ...fallbackDepts.filter(
      (f) => !depts.some((d) => norm(d.code) === norm(f.code) || norm(d.name) === norm(f.name))
    ),
  ];

  const metaFor = (d: Dept) =>
    fallbackDepts.find((f) => norm(f.code) === norm(d.code) || norm(f.name) === norm(d.name));

  return (
    <>
      <section
        ref={ref}
        className="bg-gradient-to-b from-[var(--primary)] via-[var(--muted)] via-55% to-white px-4 pb-24 pt-20"
      >
        <div className="mx-auto max-w-6xl">
          {/* heading with underlined word + caret */}
          <div
            className="text-center transition-all duration-700 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
          >
            <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Find the right care in{" "}
              <span className="relative inline-block">
                Canada
                
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm text-white/80">
              Full-service care across {list.length} departments — see our doctors or book any of them online.
            </p>
          </div>

          {/* white cards — icon top-left, glow + stagger like homepage */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d, i) => {
              const meta = metaFor(d);
              const services = d.services ?? meta?.services ?? defaultServices;
              const open24 = d.open24 ?? meta?.open24 ?? false;
              const q = encodeURIComponent(d.name);
              return (
                <div
                  key={`${d.code}-${d.id}`}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                  }}
                  className="glow-card flex min-h-[340px] flex-col overflow-hidden rounded-3xl bg-white p-8 shadow-xl shadow-[var(--primary)]/10 transition-all duration-700 ease-out"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "none" : "translateY(40px)",
                    transitionDelay: `${200 + (i % 3) * 120}ms`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-[var(--primary)]">
                      {iconFor(d.name)}
                    </div>
                    <span className="rounded-full bg-[var(--primary-tint)]/25 px-3 py-1 font-mono text-[11px] text-[var(--muted)]">
                      {d.code}
                    </span>
                  </div>
                  <h3 className="font-heading mt-8 text-xl font-semibold leading-snug text-[var(--ink)]">
                    {d.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    {d.description ?? meta?.description ?? "Consultations, diagnostics and treatment from our specialist team."}
                  </p>

                  {/* key services */}
                  <div className="mt-auto flex flex-wrap gap-2 pt-6">
                    {services.map((c) => (
                      <span key={c} className="rounded-full bg-[var(--primary-tint)]/20 px-3 py-1 text-[10px] text-[var(--muted)]">
                        {c}
                      </span>
                    ))}
                  </div>

                  {open24 && (
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-[var(--muted)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Open 24/7
                    </div>
                  )}

                  {/* actions */}
                  <div className="mt-5 flex items-center gap-3 border-t border-[var(--primary-tint)]/30 pt-5">
                    <Link
                      href={`/doctors?department=${q}`}
                      className="btn-roll inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-xs  uppercase  text-white  "
                    >
                      <span className="roll">
                        <span className="r1">See doctors</span>
                        <span className="r2" aria-hidden="true">See doctors</span>
                      </span>
                    </Link>
                   
                  </div>
                </div>
              );
            })}
          </div>

          {/* dark pill button */}
          <div
            className="mt-14 text-center transition-all duration-700 ease-out"
            style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)", transitionDelay: "900ms" }}
          >
            <Link
              href="/register"
              className="btn-roll inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-8 py-3.5 text-xs  uppercase  text-white  "
            >
              <span className="roll">
                <span className="r1">Book appointment</span>
                <span className="r2" aria-hidden="true">Book appointment</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      
      
    </>
  );
}

