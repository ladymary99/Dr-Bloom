"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { addDays, apiError, downloadFile, fmtDate, fmtDateTime, money, todayStr, wallDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import DoctorAvatar from "@/components/DoctorAvatar";
import { EmptyState, ErrorState, Field, ListSkeleton, Modal, Notice, PageHeader, StatusBadge, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";

type Doctor = {
  id: number; name: string; specialization: string | null; department: string | null; department_id: number | null;
  bio: string | null; languages: string[]; years_experience: number | null; fee: number; slot_minutes: number;
  has_photo: boolean; next_available: string | null;
};
type Filters = { departments: { id: number; name: string }[]; specializations: string[]; languages: string[] };
type Slots = { slot_minutes: number; fee: number; days: Record<string, string[]> };
type Booked = { id: string; appointment_at: string; status: string; visit_type: string; join_url: string | null; doctor?: { user?: { name: string } }; invoice?: { invoice_number: string; amount: string } | null };

const WINDOW = 14;
const normalizeName = (name: string) => name.replace(/^dr\.?\s*/i, "").trim().toLocaleLowerCase();

export default function BookPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl"><ListSkeleton rows={3} /></div>}>
      <BookPageContent />
    </Suspense>
  );
}

function BookPageContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const initialDoctor = searchParams.get("doctor")?.trim() ?? "";
  const initialDepartment = searchParams.get("department")?.trim() ?? "";
  const [step, setStep] = useState<"doctor" | "time" | "review" | "done">("doctor");
  const [filters, setFilters] = useState<Filters | null>(null);
  const [q, setQ] = useState(initialDoctor.replace(/^dr\.?\s*/i, "").trim());
  const [spec, setSpec] = useState("");
  const [dept, setDept] = useState("");
  const [lang, setLang] = useState("");
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [listError, setListError] = useState("");
  const [filtersError, setFiltersError] = useState("");
  const [departmentPrefillError, setDepartmentPrefillError] = useState("");
  const [profile, setProfile] = useState<Doctor | null>(null);
  const autoSelectedDoctor = useRef(false);

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [slotsError, setSlotsError] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [windowEnd, setWindowEnd] = useState(addDays(todayStr(), WINDOW - 1));
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [visitType, setVisitType] = useState<"in_person" | "online">("in_person");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);

  useEffect(() => {
    api.get<Filters>("/portal/doctor-filters").then(({ data }) => {
      setFilters(data);
      const department = data.departments.find(
        (item) => normalizeName(item.name) === normalizeName(initialDepartment)
      );
      if (department) setDept(String(department.id));
      else if (initialDepartment) {
        setDepartmentPrefillError(`No booking department matches "${initialDepartment}".`);
      }
    }).catch((e) => setFiltersError(apiError(e)));
  }, [initialDepartment]);

  const loadSlots = useCallback(async (d: Doctor, end: string, keepDay = false) => {
    setSlotsLoading(true);
    setSlotsError("");
    try {
      const { data } = await api.get<Slots>(`/portal/doctors/${d.id}/slots`, { params: { from: todayStr(), to: end } });
      setSlots(data);
      const days = Object.keys(data.days);
      if (!keepDay || !days.includes(day)) setDay(days[0] ?? "");
      if (!keepDay) setTime("");
    } catch (e) {
      setSlotsError(apiError(e));
    } finally {
      setSlotsLoading(false);
    }
    // `day` intentionally omitted: only read to preserve selection on reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = useCallback((d: Doctor) => {
    setProfile(null);
    setDoctor(d);
    setSlots(null);
    setDay("");
    setTime("");
    setError("");
    const end = addDays(todayStr(), WINDOW - 1);
    setWindowEnd(end);
    setStep("time");
    loadSlots(d, end);
  }, [loadSlots, setStep]);

  const loadDoctors = useCallback(async () => {
    setListError("");
    try {
      const { data } = await api.get<Doctor[]>("/portal/doctors", { params: { q: q || undefined, specialization: spec || undefined, department_id: dept || undefined, language: lang || undefined } });
      setDoctors(data);
      if (initialDoctor && !autoSelectedDoctor.current) {
        const selected = data.find((item) => normalizeName(item.name) === normalizeName(initialDoctor));
        if (selected) {
          autoSelectedDoctor.current = true;
          choose(selected);
        }
      }
    } catch (e) {
      setListError(apiError(e));
    }
  }, [choose, dept, initialDoctor, lang, q, spec]);

  // debounce typing in the search box
  useEffect(() => {
    const id = setTimeout(loadDoctors, 300);
    return () => clearTimeout(id);
  }, [loadDoctors]);

  function moreDates() {
    if (!doctor) return;
    const end = addDays(windowEnd, WINDOW);
    setWindowEnd(end);
    loadSlots(doctor, end, true);
  }

  const dayKeys = useMemo(() => Object.keys(slots?.days ?? {}), [slots]);
  const times = slots?.days[day] ?? [];
  const morning = times.filter((x) => x < "12:00");
  const afternoon = times.filter((x) => x >= "12:00");
  const selectedStart = day && time ? `${day}T${time}:00` : "";

  async function confirm() {
    if (!doctor || !day || !time) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post<Booked>("/portal/appointments", { doctor_id: doctor.id, slot: `${day} ${time}`, reason: reason.trim(), visit_type: visitType });
      setBooked(data);
      setStep("done");
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { code?: string } } };
      setError(apiError(e, "Could not book this appointment."));
      if (err.response?.status === 409) {
        setStep("time");
        loadSlots(doctor, windowEnd, true); // someone took it: show fresh availability
      }
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep("doctor");
    setDoctor(null);
    setBooked(null);
    setReason("");
    setTime("");
    setDay("");
    setVisitType("in_person");
    setError("");
    loadDoctors();
  }

  const steps = [{ id: "doctor", label: "Doctor" }, { id: "time", label: "Time" }, { id: "review", label: "Review" }];
  const stepIndex = step === "done" ? 3 : steps.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("Book appointment")} subtitle="Choose a doctor, pick a free time, and confirm. You'll get a confirmation by email." />

      {step !== "done" && (
        <ol aria-label="Progress" className="mb-6 flex items-center gap-2 text-xs font-medium">
          {steps.map((s, i) => (
            <li key={s.id} aria-current={i === stepIndex ? "step" : undefined} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${i <= stepIndex ? "bg-[var(--primary)] text-white" : "bg-white text-[var(--muted)]"}`}>{i + 1}</span>
              <span className={i === stepIndex ? "text-[var(--ink)]" : "text-[var(--muted)]"}>{s.label}</span>
              {i < steps.length - 1 && <span aria-hidden className="mx-1 h-px w-6 bg-[var(--muted)]/40" />}
            </li>
          ))}
        </ol>
      )}

      {/* ───────── Step 1: find a doctor ───────── */}
      {step === "doctor" && (
        <section aria-label={t("Find a doctor")}>
          <div className={`${cardCls} mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4`}>
            <Field label={t("Search")} className="sm:col-span-2 lg:col-span-1">
              {(p) => <input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or specialty" className={inputCls} />}
            </Field>
            <Field label="Specialty">
              {(p) => (
                <select {...p} value={spec} onChange={(e) => setSpec(e.target.value)} className={inputCls}>
                  <option value="">All specialties</option>
                  {filters?.specializations.map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
            </Field>
            <Field label="Department">
              {(p) => (
                <select {...p} value={dept} onChange={(e) => setDept(e.target.value)} className={inputCls}>
                  <option value="">All departments</option>
                  {filters?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
            </Field>
            <Field label="Language spoken">
              {(p) => (
                <select {...p} value={lang} onChange={(e) => setLang(e.target.value)} className={inputCls}>
                  <option value="">Any language</option>
                  {filters?.languages.map((l) => <option key={l}>{l}</option>)}
                </select>
              )}
            </Field>
          </div>

          {filtersError && <ErrorState message={filtersError} />}
          {departmentPrefillError && <p role="status" className="mb-4 text-sm text-[var(--muted)]">{departmentPrefillError}</p>}

          {listError ? <ErrorState message={listError} onRetry={loadDoctors} />
            : !doctors ? <ListSkeleton rows={3} />
            : doctors.length === 0 ? (
              <EmptyState title="No doctors match your search" hint="Try a different name or clear a filter." action={{ label: "Clear filters", onClick: () => { setQ(""); setSpec(""); setDept(""); setLang(""); } }} />
            ) : (
              <ul className="space-y-3" aria-live="polite">
                {doctors.map((d) => (
                  <li key={d.id} className={`${cardCls} flex flex-wrap items-center gap-4 p-5`}>
                    <DoctorAvatar id={d.id} name={d.name} hasPhoto={d.has_photo} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-heading text-base font-semibold text-[var(--ink)]">Dr. {d.name}</h2>
                      <p className="text-sm text-[var(--muted)]">{[d.specialization, d.department].filter(Boolean).join(" · ")}</p>
                      <p className="mt-1 text-xs text-[var(--ink)]">
                        {d.years_experience ? `${d.years_experience} yrs experience · ` : ""}
                        {d.languages.length ? d.languages.join(", ") : ""}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-emerald-800">
                        {d.next_available ? `Next available: ${fmtDateTime(d.next_available.replace(" ", "T") + ":00")}` : "No free slots in the next 2 weeks"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">{d.fee > 0 ? money(d.fee) : "Fee at clinic"}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setProfile(d)} className={btnGhost}>Profile</button>
                        <button onClick={() => choose(d)} className={btnPrimary}>{t("Book appointment")}</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </section>
      )}

      {/* ───────── Step 2: pick a time ───────── */}
      {step === "time" && doctor && (
        <section aria-label={t("Choose a time")} className="space-y-5">
          <div className={`${cardCls} flex items-center gap-4 p-4`}>
            <DoctorAvatar id={doctor.id} name={doctor.name} hasPhoto={doctor.has_photo} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-sm font-semibold">Dr. {doctor.name}</p>
              <p className="text-xs text-[var(--muted)]">{doctor.specialization} · {slots?.slot_minutes ?? doctor.slot_minutes} min visit</p>
            </div>
            <button onClick={() => setStep("doctor")} className={btnGhost}>Change doctor</button>
          </div>

          {error && <Notice kind="error">{error}</Notice>}
          {slotsError ? <ErrorState message={slotsError} onRetry={() => loadSlots(doctor, windowEnd, true)} />
            : !slots || slotsLoading && !slots ? <ListSkeleton rows={2} />
            : dayKeys.length === 0 ? (
              <EmptyState title="No free times in this period" hint="This doctor is fully booked or away. Try another doctor, or look further ahead."
                action={{ label: "Show more dates", onClick: moreDates }} />
            ) : (
              <>
                <div className={`${cardCls} p-5`}>
                  <h2 className="mb-3 font-heading text-sm font-semibold">Date</h2>
                  <div role="radiogroup" aria-label="Date" className="flex gap-2 overflow-x-auto pb-2">
                    {dayKeys.map((k) => {
                      const d = wallDate(k);
                      const sel = k === day;
                      return (
                        <button key={k} role="radio" aria-checked={sel} onClick={() => { setDay(k); setTime(""); }}
                          className={`flex w-16 flex-none flex-col items-center rounded-2xl border px-2 py-2.5 text-center transition ${sel ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md" : "border-[var(--border)] bg-white hover:border-[var(--primary-tint)]"}`}>
                          <span className="text-[11px] font-medium opacity-80">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                          <span className="font-heading text-lg font-semibold leading-tight">{d.getDate()}</span>
                          <span className="text-[11px] opacity-80">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                        </button>
                      );
                    })}
                    <button onClick={moreDates} disabled={slotsLoading} className="flex w-16 flex-none items-center justify-center rounded-2xl border border-dashed border-[var(--muted)] text-xs font-medium text-[var(--muted)] hover:bg-white">
                      {slotsLoading ? "…" : "More"}
                    </button>
                  </div>
                </div>

                <div className={`${cardCls} p-5`}>
                  <h2 className="mb-3 font-heading text-sm font-semibold">{day ? fmtDate(day + "T00:00:00") : "Time"}</h2>
                  {[["Morning", morning], ["Afternoon", afternoon]].map(([label, list]) => (list as string[]).length > 0 && (
                    <div key={label as string} className="mb-4 last:mb-0">
                      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">{label as string}</p>
                      <div role="radiogroup" aria-label={label as string} className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                        {(list as string[]).map((x) => (
                          <button key={x} role="radio" aria-checked={x === time} onClick={() => setTime(x)}
                            className={`rounded-xl border px-2 py-2 text-sm font-medium tabular-nums transition ${x === time ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow" : "border-[var(--border)] bg-white hover:border-[var(--primary)]"}`}>
                            {x}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`${cardCls} space-y-4 p-5`}>
                  <fieldset>
                    <legend className="mb-2 text-xs font-semibold">Type of visit</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {([["in_person", t("In person"), "Visit the clinic"], ["online", t("Video visit"), "Join from your phone or computer"]] as const).map(([v, label, hint]) => (
                        <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${visitType === v ? "border-[var(--primary)] bg-[var(--primary-tint)]/20" : "border-[var(--border)]"}`}>
                          <input type="radio" name="visit_type" checked={visitType === v} onChange={() => setVisitType(v)} className="mt-1" />
                          <span><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-[var(--muted)]">{hint}</span></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label={t("Reason for visit")} hint="A short description helps the doctor prepare (at least 3 characters).">
                    {(p) => <textarea {...p} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />}
                  </Field>
                  <div className="flex justify-end">
                    <button onClick={() => { setError(""); setStep("review"); }} disabled={!time || reason.trim().length < 3} className={btnPrimary}>{t("Next")}</button>
                  </div>
                </div>
              </>
            )}
        </section>
      )}

      {/* ───────── Step 3: review ───────── */}
      {step === "review" && doctor && (
        <section aria-label="Review" className={`${cardCls} space-y-4 p-6`}>
          <h2 className="font-heading text-lg font-semibold">Review your appointment</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Doctor", `Dr. ${doctor.name}`],
              ["Specialty", doctor.specialization ?? "—"],
              ["When", fmtDateTime(selectedStart)],
              ["Duration", `${slots?.slot_minutes ?? doctor.slot_minutes} minutes`],
              ["Visit type", visitType === "online" ? t("Video visit") : t("In person")],
              ["Fee", doctor.fee > 0 ? money(doctor.fee) : "Payable at the clinic"],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-xs font-semibold text-[var(--muted)]">{k}</dt><dd className="text-[var(--ink)]">{v}</dd></div>
            ))}
            <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--muted)]">{t("Reason for visit")}</dt><dd className="whitespace-pre-wrap text-[var(--ink)]">{reason}</dd></div>
          </dl>
          <Notice kind="info">You can cancel or reschedule free of charge up to a few hours before the visit. You&apos;ll receive reminders 24 hours and 1 hour before.</Notice>
          {error && <Notice kind="error">{error}</Notice>}
          <div className="flex justify-between gap-2">
            <button onClick={() => setStep("time")} className={btnGhost}>{t("Back")}</button>
            <button onClick={confirm} disabled={saving} className={btnPrimary}>{saving ? "Booking…" : "Confirm booking"}</button>
          </div>
        </section>
      )}

      {/* ───────── Confirmation ───────── */}
      {step === "done" && booked && doctor && (
        <section aria-live="polite" className={`${cardCls} p-8 text-center`}>
          <div aria-hidden className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-800">✓</div>
          <h2 className="font-heading text-xl font-semibold">You&apos;re booked!</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">A confirmation has been sent to your email and notifications.</p>
          <div className="mx-auto mt-6 max-w-sm space-y-1 rounded-2xl bg-[var(--primary-tint)]/20 p-4 text-left text-sm">
            <p className="font-heading font-semibold">Dr. {doctor.name}</p>
            <p>{fmtDateTime(booked.appointment_at)}</p>
            <p className="text-[var(--muted)]">{booked.visit_type === "online" ? t("Video visit") : t("In person")} · <StatusBadge status={booked.status} /></p>
            {booked.invoice && <p className="text-xs text-[var(--muted)]">Invoice {booked.invoice.invoice_number}: {money(booked.invoice.amount)}</p>}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button onClick={() => downloadFile(api, `/portal/appointments/${booked.id}/ics`, "appointment.ics").catch(() => setError("Could not create the calendar file."))} className={btnGhost}>{t("Add to calendar")}</button>
            {booked.join_url && <a href={booked.join_url} target="_blank" rel="noopener noreferrer" className={btnGhost}>{t("Join video visit")}</a>}
            <Link href="/portal/appointments" className={btnPrimary}>{t("Appointments")}</Link>
            <button onClick={reset} className={btnGhost}>Book another</button>
          </div>
          {error && <div className="mt-4"><Notice kind="error">{error}</Notice></div>}
        </section>
      )}

      {/* Doctor profile */}
      <Modal open={!!profile} onClose={() => setProfile(null)} title={profile ? `Dr. ${profile.name}` : ""}
        footer={profile && <><button onClick={() => setProfile(null)} className={btnGhost}>{t("Close")}</button><button onClick={() => choose(profile)} className={btnPrimary}>{t("Book appointment")}</button></>}>
        {profile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <DoctorAvatar id={profile.id} name={profile.name} hasPhoto={profile.has_photo} className="h-20 w-20" />
              <div>
                <p className="text-sm font-semibold">{profile.specialization}</p>
                <p className="text-sm text-[var(--muted)]">{profile.department}</p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs text-[var(--muted)]">Experience</dt><dd className="font-semibold">{profile.years_experience ? `${profile.years_experience} yrs` : "—"}</dd></div>
              <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs text-[var(--muted)]">Consultation</dt><dd className="font-semibold">{profile.fee > 0 ? money(profile.fee) : "At clinic"}</dd></div>
              <div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs text-[var(--muted)]">Visit length</dt><dd className="font-semibold">{profile.slot_minutes} min</dd></div>
            </dl>
            <div><h3 className="mb-1 text-xs font-semibold text-[var(--muted)]">About</h3><p className="whitespace-pre-wrap text-sm">{profile.bio || "This doctor hasn't added a biography yet."}</p></div>
            {profile.languages.length > 0 && <div><h3 className="mb-1 text-xs font-semibold text-[var(--muted)]">Languages</h3><p className="text-sm">{profile.languages.join(", ")}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
