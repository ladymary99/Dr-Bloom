"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiError, fmtDateTime, fmtShortDate, fmtShortDateTime, money } from "@/lib/format";
import { useFetch } from "@/hooks/useFetch";
import { ErrorState, Field, ListSkeleton, Modal, Notice, StatusBadge, btnGhost, btnPrimary, cardCls, inputCls } from "@/components/ui";
import Icd10Picker from "@/components/encounter/Icd10Picker";
import VitalsCard from "@/components/encounter/VitalsCard";
import PrescriptionPanel from "@/components/encounter/PrescriptionPanel";
import OrdersPanel from "@/components/encounter/OrdersPanel";
import LettersPanel from "@/components/encounter/LettersPanel";
import FollowUpPanel from "@/components/encounter/FollowUpPanel";
import ServicesPanel, { type Service } from "@/components/encounter/ServicesPanel";
import { toForm, toPayload, type Encounter, type Form } from "@/components/encounter/types";

type Version = { id: number; version: number; created_at: string; editor?: { name: string } | null; snapshot: Record<string, unknown> };
type SaveState = "idle" | "saving" | "saved" | "error";

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={`${cardCls} p-6`}>
      <h2 id={id} className="font-heading text-base font-semibold text-[var(--ink)]">{title}</h2>
      {hint && <p className="mb-4 mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export default function VisitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, setData, error, reload } = useFetch<Encounter>(`/visits/${id}`);

  const [form, setForm] = useState<Form | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [slot, setSlot] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "warn"; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [addendum, setAddendum] = useState("");
  const [feeLoaded, setFeeLoaded] = useState(false);
  const [unsaved, setUnsaved] = useState(false);

  const formRef = useRef<Form | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draft = data?.visit.status === "draft" && data.can_edit !== false;
  const locked = !draft;

  // initialise the form once the visit arrives
  useEffect(() => {
    if (data && !form) {
      const f = toForm(data.visit);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(f);
      formRef.current = f;
    }
  }, [data, form]);

  // pre-fill the consultation fee line for visits that have no invoice yet
  useEffect(() => {
    if (!data || !draft || feeLoaded || data.invoice) return;
    api.get("/doctor/availability").then(({ data: av }) => {
      const fee = Number(av.consultation_fee);
      if (fee > 0) setServices((s) => (s.length ? s : [{ description: "Consultation fee", quantity: "1", unit_price: String(fee) }]));
    }).catch(() => {}).finally(() => setFeeLoaded(true));
  }, [data, draft, feeLoaded]);

  const saveNow = useCallback(async () => {
    if (!formRef.current || !dirty.current) return true;
    setSaveState("saving");
    try {
      await api.put(`/visits/${id}`, toPayload(formRef.current));
      dirty.current = false;
      setUnsaved(false);
      setSaveState("saved");
      setSavedAt(new Date().toISOString());
      return true;
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      setSaveState("error");
      setMsg({ kind: "error", text: status === 423 ? "This note was signed in another window and is now locked." : apiError(e, "Could not save. Your changes are kept on screen: check your connection.") });
      if (status === 423) reload();
      return false;
    }
  }, [id, reload]);

  function change(patch: Partial<Form>) {
    setForm((f) => {
      const next = f ? { ...f, ...patch } : f;
      formRef.current = next;
      return next;
    });
    dirty.current = true;
    setUnsaved(true);
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(saveNow, 2500);
  }

  // never lose work silently
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); if (timer.current) clearTimeout(timer.current); };
  }, []);

  async function refreshSideData() {
    // reload prescriptions / orders / letters without disturbing what is being typed
    try { const { data: fresh } = await api.get<Encounter>(`/visits/${id}`); setData((cur) => (cur ? { ...cur, prescription: fresh.prescription, lab_tests: fresh.lab_tests, letters: fresh.letters, addenda: fresh.addenda, invoice: fresh.invoice } : fresh)); }
    catch { /* keep what we have */ }
  }

  async function complete() {
    if (!formRef.current) return;
    setCompleting(true); setMsg(null);
    if (timer.current) clearTimeout(timer.current);
    try {
      const body = {
        ...toPayload(formRef.current),
        services: services.filter((s) => s.description.trim() && s.unit_price !== "").map((s) => ({ description: s.description.trim(), quantity: Number(s.quantity) || 1, unit_price: Number(s.unit_price) })),
        follow_up_slot: slot || undefined,
      };
      const { data: res } = await api.post<Encounter & { follow_up_appointment_id?: string }>(`/visits/${id}/complete`, body);
      dirty.current = false;
      setUnsaved(false);
      setData({ ...res, can_edit: false });
      setForm(toForm(res.visit)); formRef.current = toForm(res.visit);
      setConfirm(false);
      setMsg({ kind: "success", text: res.follow_up_appointment_id ? "Visit signed and published to the patient. The follow-up appointment is booked." : "Visit signed and published to the patient’s medical records." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setConfirm(false);
      const resp = (e as { response?: { status?: number; data?: { code?: string } } }).response;
      setMsg({ kind: "error", text: apiError(e, "Could not complete the visit.") });
      if (resp?.status === 409) setSlot("");   // the follow-up time was taken: choose another
    } finally { setCompleting(false); }
  }

  async function addAddendum() {
    try {
      await api.post(`/visits/${id}/addenda`, { body: addendum.trim() });
      setAddendum(""); await refreshSideData();
    } catch (e) { setMsg({ kind: "error", text: apiError(e) }); }
  }

  async function toggleShare(key: "share_diagnosis" | "share_vitals" | "share_notes", value: boolean) {
    change({ [key]: value } as Partial<Form>);
    if (data?.visit.status === "signed") {
      try { await api.put(`/visits/${id}/sharing`, { [key]: value }); dirty.current = false; setMsg({ kind: "success", text: "Sharing updated. The patient sees the change straight away." }); }
      catch (e) { setMsg({ kind: "error", text: apiError(e) }); }
    }
  }

  async function openVersions() {
    try { const { data: v } = await api.get<Version[]>(`/visits/${id}/versions`); setVersions(v); } catch (e) { setMsg({ kind: "error", text: apiError(e) }); }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || !form) return <div className="w-full"><ListSkeleton rows={4} /></div>;

  const p = data.patient;
  const hasDx = !!(form.assessment.trim() || form.diagnosis.trim() || form.diagnosis_codes.length);
  const billTotal = services.reduce((s, x) => s + (Number(x.quantity) || 0) * (Number(x.unit_price) || 0), 0);
  const ta = (k: "subjective" | "objective" | "assessment" | "plan", label: string, hint: string) => (
    <Field label={label} hint={hint}>
      {(a) => <textarea {...a} rows={4} maxLength={8000} disabled={locked} value={form[k]} onChange={(e) => change({ [k]: e.target.value } as Partial<Form>)} className={inputCls} />}
    </Field>
  );

  return (
    <div className="animate-fade-up w-full pb-28">
      {/* Patient safety header: always visible */}
      <header className="sticky top-0 z-30 -mx-1 mb-5 rounded-3xl border border-[var(--border)] bg-white/95 px-5 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-heading text-xl font-semibold text-[var(--ink)]">
              <Link href={`/patients/${p.id}`} className="hover:underline">{p.name}</Link>
              <span className="ml-2 text-sm font-normal text-[var(--muted)]">{[p.age !== null ? `${p.age} y` : null, p.gender, p.blood_type].filter(Boolean).join(" · ")} · {p.mrn}</span>
            </h1>
            <p className="text-xs text-[var(--muted)]">Visit {fmtDateTime(data.visit.visited_at)}{data.appointment?.reason ? ` · booked for “${data.appointment.reason}”` : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <StatusBadge status={data.visit.status} />
            <span aria-live="polite" className="text-[var(--muted)]">
              {locked ? `Signed ${fmtShortDateTime(data.visit.signed_at)}` : saveState === "saving" ? "Saving…" : saveState === "saved" ? `Saved ${savedAt ? new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}` : saveState === "error" ? "Not saved" : unsaved ? "Unsaved changes" : "All changes saved"}
            </span>
            <button onClick={openVersions} className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">History (v{data.visit.version})</button>
            <Link href={`/patients/${p.id}`} className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">Open chart</Link>
          </div>
        </div>
        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
          <p className={`rounded-xl px-3 py-1.5 ${p.allergies ? "bg-red-100 text-red-900" : "bg-slate-100 text-slate-700"}`}><b>{p.allergies ? "⚠ Allergies: " : "Allergies: "}</b>{p.allergies || "none recorded"}</p>
          <p className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-800"><b>Conditions: </b>{p.chronic_conditions || "none recorded"}</p>
          <p className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-800"><b>Medications: </b>{p.current_medications || "none recorded"}</p>
        </div>
      </header>

      {msg && <div className="mb-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      {locked && <div className="mb-4"><Notice kind="info">This note is <b>signed and locked</b>. To correct or add something, use an addendum at the bottom; the original is never overwritten.</Notice></div>}

      <div className="grid gap-5 lg:grid-cols-[1fr_17rem]">
        <div className="space-y-5">
          <Section id="s-reason" title="Reason for visit">
            <Field label="Chief complaint">{(a) => <input {...a} maxLength={1000} disabled={locked} value={form.chief_complaint} onChange={(e) => change({ chief_complaint: e.target.value })} className={inputCls} />}</Field>
          </Section>

          <Section id="s-vitals" title="Vitals" hint="Out-of-range values are flagged; nothing is blocked.">
            <VitalsCard vitals={form.vitals} onChange={(v) => change({ vitals: v })} disabled={locked} />
          </Section>

          <Section id="s-soap" title="Clinical notes (SOAP)">
            <div className="grid gap-4">
              {ta("subjective", "Subjective", "What the patient reports: history, symptoms, duration.")}
              {ta("objective", "Objective", "Examination findings and results.")}
              {ta("assessment", "Assessment", "Your clinical impression.")}
              {ta("plan", "Plan", "Treatment, advice, investigations.")}
            </div>
          </Section>

          <Section id="s-dx" title="Diagnosis" hint="Search ICD-10 codes; add free text if no code fits.">
            <Icd10Picker value={form.diagnosis_codes} onChange={(c) => change({ diagnosis_codes: c })} disabled={locked} />
            <Field label="Diagnosis in words (optional)" className="mt-3">{(a) => <input {...a} maxLength={2000} disabled={locked} value={form.diagnosis} onChange={(e) => change({ diagnosis: e.target.value })} className={inputCls} />}</Field>
          </Section>

          <Section id="s-rx" title="Prescription">
            <PrescriptionPanel visitId={id} prescriptionId={data.prescription?.id ?? null} items={data.prescription?.items ?? []} locked={locked} onChanged={refreshSideData} />
          </Section>

          <Section id="s-orders" title="Lab & imaging orders">
            <OrdersPanel visitId={id} patientId={p.id} labs={data.lab_tests} locked={locked} onChanged={refreshSideData} />
          </Section>

          <Section id="s-letters" title="Sick note & referral">
            <LettersPanel visitId={id} letters={data.letters} onChanged={refreshSideData} />
          </Section>

          <Section id="s-fu" title="Follow-up">
            <FollowUpPanel form={form} onChange={change} slot={slot} onSlot={setSlot} disabled={locked} />
          </Section>

          <Section id="s-bill" title="Services & billing" hint={locked ? undefined : "What you performed in this visit. These become invoice lines when you complete it."}>
            <ServicesPanel services={services} onChange={setServices} invoice={data.invoice} disabled={locked} />
          </Section>

          <Section id="s-share" title="Visible to the patient" hint="What appears in the patient’s portal. Reason for visit and prescriptions are always visible once signed.">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {([["share_diagnosis", "Diagnosis"], ["share_vitals", "Vitals"], ["share_notes", "My clinical notes"]] as const).map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={form[k]} onChange={(e) => toggleShare(k, e.target.checked)} />{label}</label>
              ))}
            </div>
            <Field label="Private notes (never shown to the patient unless “My clinical notes” is on)" className="mt-4">{(a) => <textarea {...a} rows={2} maxLength={4000} disabled={locked} value={form.notes} onChange={(e) => change({ notes: e.target.value })} className={inputCls} />}</Field>
          </Section>

          {locked && (
            <Section id="s-add" title="Addenda" hint="Corrections and additions to a signed note. Each is dated and attributed.">
              {data.addenda.length === 0 && <p className="mb-3 text-sm text-[var(--muted)]">None yet.</p>}
              <ul className="mb-4 space-y-2">{data.addenda.map((a) => <li key={a.id} className="rounded-2xl bg-slate-50 p-3 text-sm"><p className="whitespace-pre-wrap">{a.body}</p><p className="mt-1 text-xs text-[var(--muted)]">{a.author} · {fmtShortDateTime(a.created_at)}</p></li>)}</ul>
              <Field label="New addendum">{(a) => <textarea {...a} rows={3} maxLength={4000} value={addendum} onChange={(e) => setAddendum(e.target.value)} className={inputCls} />}</Field>
              <button onClick={addAddendum} disabled={addendum.trim().length < 3} className={`${btnPrimary} mt-3`}>Add addendum</button>
            </Section>
          )}
        </div>

        {/* Context sidebar */}
        <aside aria-label="Previous visits" className="space-y-4 lg:sticky lg:top-44 lg:self-start">
          <div className={`${cardCls} p-5`}>
            <h2 className="mb-3 font-heading text-sm font-semibold">Previous visits</h2>
            {data.previous.length === 0 ? <p className="text-xs text-[var(--muted)]">No earlier signed visits.</p> : (
              <ul className="space-y-3 text-xs">
                {data.previous.map((v) => (
                  <li key={v.id} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <p className="font-semibold text-[var(--ink)]">{fmtShortDate(v.visited_at)} · {v.doctor ? `Dr. ${v.doctor}` : ""}</p>
                    {v.chief_complaint && <p className="text-[var(--muted)]">{v.chief_complaint}</p>}
                    {v.codes?.length ? <p className="mt-0.5">{v.codes.map((c) => c.code).join(", ")}</p> : null}
                    {v.diagnosis && <p className="mt-0.5 line-clamp-2">{v.diagnosis}</p>}
                    {v.vitals?.bp_systolic && <p className="mt-0.5 text-[var(--muted)]">BP {String(v.vitals.bp_systolic)}/{String(v.vitals.bp_diastolic ?? "–")}{v.vitals.weight ? ` · ${String(v.vitals.weight)} kg` : ""}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Action bar */}
      <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <button onClick={() => router.push("/dashboard")} className={btnGhost}>{locked ? "Back to my day" : "Leave (draft is saved)"}</button>
          {draft ? (
            <div className="flex items-center gap-3">
              {!hasDx && <span className="hidden text-xs text-[var(--muted)] sm:inline">Add an assessment or diagnosis to complete.</span>}
              <button onClick={async () => { if (await saveNow()) setMsg({ kind: "success", text: "Draft saved." }); }} className={btnGhost}>Save draft</button>
              <button onClick={() => { setMsg(null); setConfirm(true); }} disabled={!hasDx || !form.chief_complaint.trim()} className={btnPrimary}>Complete & sign…</button>
            </div>
          ) : (
            <Link href={`/patients/${p.id}`} className={btnPrimary}>Back to chart</Link>
          )}
        </div>
      </div>

      <Modal open={confirm} onClose={() => !completing && setConfirm(false)} title="Complete and sign this visit?"
        footer={<><button onClick={() => setConfirm(false)} disabled={completing} className={btnGhost}>Keep editing</button><button onClick={complete} disabled={completing} className={btnPrimary}>{completing ? "Signing…" : "Sign & publish"}</button></>}>
        <div className="space-y-3 text-sm">
          <p>Once signed, the note is <b>locked</b> (later corrections become addenda) and published to the patient’s portal.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{form.diagnosis_codes.length ? `${form.diagnosis_codes.length} coded diagnosis${form.diagnosis_codes.length > 1 ? "es" : ""}` : "No ICD-10 code (diagnosis in words)"}</li>
            <li>{data.prescription?.items.length ? `${data.prescription.items.length} medicine(s) prescribed` : "No prescription"}</li>
            <li>{data.lab_tests.length ? `${data.lab_tests.length} test(s) ordered` : "No tests ordered"}</li>
            <li>{services.filter((s) => s.description.trim()).length ? `Billing ${money(billTotal)} (${services.filter((s) => s.description.trim()).length} service line${services.length > 1 ? "s" : ""})` : "Nothing to bill"}</li>
            <li>{slot ? `Follow-up booked: ${fmtDateTime(slot.replace(" ", "T") + ":00")}` : form.follow_up_days ? `Follow-up advised in ${form.follow_up_days} days (not booked)` : "No follow-up"}</li>
            <li>Patient will see: {[form.share_diagnosis && "diagnosis", form.share_vitals && "vitals", form.share_notes && "your notes"].filter(Boolean).join(", ") || "reason for visit and prescriptions only"}</li>
          </ul>
          {data.patient.allergies && data.prescription?.items.length ? <Notice kind="warn">Allergies on file: {data.patient.allergies}. Confirm the prescription is safe.</Notice> : null}
        </div>
      </Modal>

      <Modal open={versions !== null} onClose={() => setVersions(null)} title="Version history" wide footer={<button onClick={() => setVersions(null)} className={btnGhost}>Close</button>}>
        {versions && (versions.length === 0 ? <p className="text-sm text-[var(--muted)]">No earlier versions yet. A snapshot is kept each time the note changes.</p> : (
          <ul className="space-y-3">
            {versions.map((v) => (
              <li key={v.id} className="rounded-2xl border border-[var(--border)] p-3 text-sm">
                <p className="font-semibold">Version {v.version} <span className="font-normal text-[var(--muted)]">· replaced {fmtShortDateTime(v.created_at)} by {v.editor?.name ?? "—"}</span></p>
                <details className="mt-1"><summary className="cursor-pointer text-xs text-[var(--primary)]">Show content of this version</summary>
                  <dl className="mt-2 space-y-1 text-xs">{Object.entries(v.snapshot).filter(([, val]) => val !== null && val !== "" && !(Array.isArray(val) && val.length === 0)).map(([k, val]) => <div key={k}><dt className="font-semibold capitalize">{k.replace(/_/g, " ")}</dt><dd className="whitespace-pre-wrap text-[var(--muted)]">{typeof val === "string" ? val : JSON.stringify(val)}</dd></div>)}</dl>
                </details>
              </li>
            ))}
          </ul>
        ))}
      </Modal>
    </div>
  );
}
