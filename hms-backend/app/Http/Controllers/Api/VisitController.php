<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\SlotUnavailableException;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ClinicalLetter;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Visit;
use App\Models\VisitAddendum;
use App\Models\VisitVersion;
use App\Services\BookingService;
use App\Services\PatientAccess;
use App\Support\Audit;
use App\Support\Notify;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Encounter workflow:  start (draft) → edit / autosave (versioned) → complete (signed + locked)
 * After signing, the note never changes; corrections are append-only addenda.
 */
class VisitController extends Controller
{
    public function __construct(private BookingService $booking) {}

    // ───────────────────────── helpers ─────────────────────────

    private function myDoctorId(Request $request): int
    {
        $id = $request->user()->staffProfile?->id;
        abort_if(! $id, 403, 'No staff profile linked to this account.');

        return $id;
    }

    /** The author (or an admin) may edit; everyone else is read-only. */
    private function ensureOwner(Request $request, Visit $visit): void
    {
        $user = $request->user();
        if ($user->hasRole('admin')) {
            return;
        }
        abort_if($visit->doctor_id !== $user->staffProfile?->id, 403, 'Only the doctor who started this visit can change it.');
    }

    private function ensureDraft(Visit $visit): void
    {
        abort_if($visit->isSigned(), 423, 'This note is signed and locked. Add an addendum to correct it.');
    }

    private function patientHeader(Patient $p): array
    {
        return [
            'id' => $p->id, 'mrn' => $p->mrn, 'name' => $p->first_name.' '.$p->last_name,
            'date_of_birth' => $p->date_of_birth?->toDateString(),
            'age' => $p->date_of_birth?->age, 'gender' => $p->gender, 'blood_type' => $p->blood_type,
            'allergies' => $p->allergies, 'chronic_conditions' => $p->chronic_conditions,
            'current_medications' => $p->current_medications,
            'emergency_contact_name' => $p->emergency_contact_name,
        ];
    }

    private function rules(): array
    {
        return [
            'chief_complaint' => 'nullable|string|max:1000',
            'vitals' => 'nullable|array',
            'vitals.bp_systolic' => 'nullable|numeric|between:30,300',
            'vitals.bp_diastolic' => 'nullable|numeric|between:20,200',
            'vitals.pulse' => 'nullable|numeric|between:20,300',
            'vitals.temperature' => 'nullable|numeric|between:30,45',
            'vitals.weight' => 'nullable|numeric|between:0.3,500',
            'vitals.height' => 'nullable|numeric|between:20,260',
            'vitals.spo2' => 'nullable|numeric|between:30,100',
            'vitals.resp_rate' => 'nullable|numeric|between:3,80',
            'subjective' => 'nullable|string|max:8000',
            'objective' => 'nullable|string|max:8000',
            'assessment' => 'nullable|string|max:8000',
            'plan' => 'nullable|string|max:8000',
            'diagnosis' => 'nullable|string|max:2000',
            'diagnosis_codes' => 'nullable|array|max:12',
            'diagnosis_codes.*.code' => 'required|string|max:10',
            'diagnosis_codes.*.description' => 'required|string|max:300',
            'notes' => 'nullable|string|max:4000',
            'follow_up_days' => 'nullable|integer|min:1|max:730',
            'follow_up_note' => 'nullable|string|max:300',
            'share_diagnosis' => 'boolean',
            'share_vitals' => 'boolean',
            'share_notes' => 'boolean',
        ];
    }

    // ───────────────────────── start / read ─────────────────────────

    // POST /api/visits  {appointment_id?, patient_id}  — start (or resume) a consultation
    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'required_without:appointment_id|nullable|uuid|exists:patients,id',
            'appointment_id' => 'nullable|uuid|exists:appointments,id',
            'type' => 'nullable|in:opd,ipd,emergency',
        ]);
        $doctorId = $this->myDoctorId($request);

        // starting from an appointment: the patient is whoever is booked
        if (! empty($data['appointment_id']) && empty($data['patient_id'])) {
            $data['patient_id'] = Appointment::whereKey($data['appointment_id'])->where('doctor_id', $doctorId)->firstOrFail()->patient_id;
        }

        $appointment = null;
        if (! empty($data['appointment_id'])) {
            $appointment = Appointment::whereKey($data['appointment_id'])
                ->where('patient_id', $data['patient_id'])->where('doctor_id', $doctorId)->firstOrFail();
            abort_if(in_array($appointment->status, ['cancelled', 'no_show'], true), 422, "This appointment is {$appointment->status}.");

            // resume instead of creating a second note for the same appointment
            if ($existing = Visit::where('appointment_id', $appointment->id)->first()) {
                return response()->json($this->payload($existing->load('doctor.user')), 200);
            }
        } else {
            PatientAccess::authorize($request->user(), $data['patient_id']);
        }

        $visit = DB::transaction(function () use ($data, $doctorId, $appointment) {
            $visit = Visit::create([
                'patient_id' => $data['patient_id'], 'appointment_id' => $appointment?->id, 'doctor_id' => $doctorId,
                'visited_at' => now(), 'type' => $data['type'] ?? 'opd', 'status' => 'draft',
                'chief_complaint' => $appointment?->reason,
            ]);
            if ($appointment && ! in_array($appointment->status, ['completed'], true)) {
                $appointment->update(['status' => 'in_consultation', 'consultation_started_at' => now(),
                    'checked_in_at' => $appointment->checked_in_at ?? now()]);
            }

            return $visit;
        });
        Audit::log($request, 'visit_started', $visit);

        return response()->json($this->payload($visit->load('doctor.user')), 201);
    }

    // GET /api/visits/{visit}
    public function show(Request $request, Visit $visit)
    {
        $user = $request->user();
        $owner = $user->hasRole('admin') || $visit->doctor_id === $user->staffProfile?->id;
        if (! $owner) {
            // other clinicians may read SIGNED notes of patients they may open; drafts stay private to the author
            abort_unless($visit->isSigned(), 403, 'This note is still a draft.');
            PatientAccess::authorize($user, $visit->patient_id);
        }
        Audit::log($request, 'viewed_visit', $visit, null, [], PatientAccess::viaGlass($user, $visit->patient_id) ? ['access' => 'break_glass'] : []);

        return response()->json($this->payload($visit->load('doctor.user')) + ['can_edit' => $owner && ! $visit->isSigned()]);
    }

    private function payload(Visit $visit): array
    {
        $visit->load('patient', 'prescription.items', 'addenda.author:id,name', 'letters', 'labTests.doctor.user:id,name', 'appointment:id,appointment_at,reason,visit_type,duration_minutes');

        $recent = Visit::with('doctor.user:id,name')->where('patient_id', $visit->patient_id)->where('id', '!=', $visit->id)
            ->where('status', 'signed')->orderByDesc('visited_at')->limit(5)
            ->get(['id', 'visited_at', 'doctor_id', 'diagnosis', 'assessment', 'diagnosis_codes', 'vitals', 'chief_complaint']);

        return [
            'visit' => $visit->only(['id', 'patient_id', 'appointment_id', 'doctor_id', 'visited_at', 'type', 'status', 'chief_complaint', 'vitals',
                'subjective', 'objective', 'assessment', 'plan', 'diagnosis', 'diagnosis_codes', 'notes', 'follow_up_days', 'follow_up_note',
                'share_diagnosis', 'share_vitals', 'share_notes', 'signed_at', 'version']),
            'doctor' => $visit->doctor?->user?->name,
            'patient' => $this->patientHeader($visit->patient),
            'appointment' => $visit->appointment,
            'prescription' => $visit->prescription,
            'lab_tests' => $visit->labTests,
            'letters' => $visit->letters,
            'addenda' => $visit->addenda->map(fn ($a) => ['id' => $a->id, 'body' => $a->body, 'author' => $a->author?->name, 'created_at' => $a->created_at]),
            'previous' => $recent->map(fn ($v) => [
                'id' => $v->id, 'visited_at' => $v->visited_at, 'doctor' => $v->doctor?->user?->name,
                'diagnosis' => $v->diagnosis ?: $v->assessment, 'codes' => $v->diagnosis_codes, 'vitals' => $v->vitals, 'chief_complaint' => $v->chief_complaint,
            ]),
            'invoice' => Invoice::where('visit_id', $visit->id)->orWhere(fn ($q) => $q->where('appointment_id', $visit->appointment_id)->whereNotNull('appointment_id'))
                ->first(['id', 'invoice_number', 'amount', 'status']),
        ];
    }

    // ───────────────────────── editing (versioned) ─────────────────────────

    // PUT /api/visits/{visit}  — autosave / save draft
    public function update(Request $request, Visit $visit)
    {
        $this->ensureOwner($request, $visit);
        $this->ensureDraft($visit);
        $data = $request->validate($this->rules());

        $before = $visit->only(Visit::NOTE_FIELDS);
        $visit->fill($data);
        $changed = $visit->isDirty(Visit::NOTE_FIELDS);

        DB::transaction(function () use ($visit, $before, $changed, $request) {
            if ($changed) {
                // Autosave fires every few seconds while typing: keep one snapshot per 5 minutes of editing
                // (the previous content), so history stays meaningful instead of thousands of rows.
                $last = $visit->versions()->latest('id')->first();
                if (! $last || $last->created_at->lt(now()->subMinutes(5)) || $last->edited_by !== $request->user()->id) {
                    VisitVersion::create(['visit_id' => $visit->id, 'version' => $visit->version, 'snapshot' => $before, 'edited_by' => $request->user()->id]);
                    $visit->version = $visit->version + 1;
                }
            }
            $visit->save();
        });

        return response()->json(['version' => $visit->version, 'saved_at' => now()->toIso8601String()]);
    }

    // GET /api/visits/{visit}/versions
    public function versions(Request $request, Visit $visit)
    {
        $this->ensureOwner($request, $visit);
        Audit::log($request, 'viewed_visit_versions', $visit);

        return $visit->versions()->with('editor:id,name')->orderByDesc('version')->limit(50)->get();
    }

    // POST /api/visits/{visit}/complete  — sign, lock, bill, publish
    public function complete(Request $request, Visit $visit)
    {
        $this->ensureOwner($request, $visit);
        $this->ensureDraft($visit);

        $data = $request->validate($this->rules() + [
            'services' => 'nullable|array|max:30',
            'services.*.description' => 'required|string|max:255',
            'services.*.quantity' => 'required|numeric|min:0.01|max:9999',
            'services.*.unit_price' => 'required|numeric|min:0|max:9999999',
            'follow_up_slot' => ['nullable', 'date_format:Y-m-d H:i'],
        ]);
        $original = collect(Visit::NOTE_FIELDS)->mapWithKeys(fn ($f) => [$f => $visit->getOriginal($f)])->all();
        $visit->fill(collect($data)->only(array_keys($this->rules()))->all());

        if (! filled($visit->chief_complaint)) {
            throw ValidationException::withMessages(['chief_complaint' => ['Add the reason for the visit before completing.']]);
        }
        if (! filled($visit->assessment) && ! filled($visit->diagnosis) && empty($visit->diagnosis_codes)) {
            throw ValidationException::withMessages(['assessment' => ['Record an assessment or a diagnosis before completing.']]);
        }

        $followUp = null;
        try {
            DB::transaction(function () use ($request, $visit, $data, $original, &$followUp) {
                // follow-up first: if the slot was taken meanwhile nothing gets signed
                if (! empty($data['follow_up_slot'])) {
                    $doctor = $visit->doctor()->with('user')->first();
                    $patient = $visit->patient;
                    $followUp = $this->booking->book($patient, $doctor, CarbonImmutable::createFromFormat('Y-m-d H:i', $data['follow_up_slot']),
                        'Follow-up: '.($visit->chief_complaint ?: 'previous visit'), $visit->appointment?->visit_type ?? 'in_person', $request->user());
                }

                if ($visit->isDirty(Visit::NOTE_FIELDS)) {
                    VisitVersion::create(['visit_id' => $visit->id, 'version' => $visit->version, 'snapshot' => $original, 'edited_by' => $request->user()->id]);
                    $visit->version++;
                }
                $visit->status = 'signed';
                $visit->signed_at = now();
                $visit->signed_by = $request->user()->id;
                $visit->save();

                if ($visit->appointment_id) {
                    Appointment::whereKey($visit->appointment_id)->update(['status' => 'completed', 'completed_at' => now()]);
                }
                $this->billServices($visit, $data['services'] ?? [], $request->user()->id);
            });
        } catch (SlotUnavailableException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'slot_unavailable'], 409);
        }

        Audit::log($request, 'visit_signed', $visit, null, [], ['version' => $visit->version]);
        Notify::patient($visit->patient->load('user'), 'visit_summary', 'A new visit summary is available in your medical records.', '/portal/records', 'New visit summary available');
        if ($followUp) {
            Notify::patient($visit->patient, 'appointment_confirmed', 'A follow-up appointment was booked for you on '.$followUp->appointment_at->format('D, M j \a\t H:i').'.', '/portal/appointments', 'Follow-up booked');
        }

        return response()->json($this->payload($visit->fresh()->load('doctor.user')) + ['follow_up_appointment_id' => $followUp?->id]);
    }

    /** Services performed become invoice lines (added to the visit's open invoice, or a new one). */
    private function billServices(Visit $visit, array $services, int $userId): void
    {
        $services = array_values(array_filter($services, fn ($s) => (float) $s['unit_price'] >= 0));
        if (! $services) {
            return;
        }

        $invoice = $visit->appointment_id
            ? Invoice::where('appointment_id', $visit->appointment_id)->whereIn('status', ['pending', 'partial'])->first()
            : null;

        if (! $invoice) {
            $doctor = $visit->doctor;
            $invoice = Invoice::create([
                'patient_id' => $visit->patient_id, 'department_id' => $doctor?->department_id, 'doctor_id' => $visit->doctor_id,
                'visit_id' => $visit->id, 'appointment_id' => null,
                'description' => 'Visit '.$visit->visited_at->format('d M Y'), 'amount' => 0, 'status' => 'pending',
                'source' => 'reception', 'created_by' => $userId, 'due_date' => now()->toDateString(),
            ]);
        } else {
            $invoice->update(['visit_id' => $visit->id]);
        }

        foreach ($services as $s) {
            InvoiceItem::create(['invoice_id' => $invoice->id, 'description' => $s['description'], 'quantity' => $s['quantity'], 'unit_price' => $s['unit_price']]);
        }
        $invoice->update(['amount' => $invoice->items()->sum(DB::raw('quantity * unit_price'))]);
        $invoice->recalculate();
    }

    // POST /api/visits/{visit}/addenda — the only way to amend a signed note
    public function addendum(Request $request, Visit $visit)
    {
        $this->ensureOwner($request, $visit);
        abort_unless($visit->isSigned(), 422, 'Edit the draft directly; addenda are for signed notes.');
        $data = $request->validate(['body' => 'required|string|min:3|max:4000']);

        $a = VisitAddendum::create(['visit_id' => $visit->id, 'author_id' => $request->user()->id, 'body' => $data['body']]);
        Audit::log($request, 'visit_addendum', $visit);

        return response()->json(['id' => $a->id, 'body' => $a->body, 'author' => $request->user()->name, 'created_at' => $a->created_at], 201);
    }

    // PUT /api/visits/{visit}/sharing — doctor changes what the patient can see (allowed after signing)
    public function updateSharing(Request $request, Visit $visit)
    {
        $this->ensureOwner($request, $visit);
        $data = $request->validate(['share_diagnosis' => 'sometimes|boolean', 'share_vitals' => 'sometimes|boolean', 'share_notes' => 'sometimes|boolean']);
        $old = $visit->only(array_keys($data));
        $visit->update($data);
        Audit::log($request, 'visit_sharing_changed', $visit, null, $old, $data);

        return $visit->fresh();
    }

    // ───────────────────────── prescriptions ─────────────────────────

    // POST /api/visits/{visit}/prescriptions — adds medicines (creating the prescription on first use)
    public function addPrescription(Request $request, Visit $visit)
    {
        $this->ensureOwner($request, $visit);
        $this->ensureDraft($visit);

        $data = $request->validate([
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1|max:20',
            'items.*.medicine_name' => 'required|string|max:150',
            'items.*.dosage' => 'required|string|max:50',
            'items.*.frequency' => 'required|string|max:50',
            'items.*.duration_days' => 'nullable|integer|min:1|max:365',
            'items.*.instructions' => 'nullable|string|max:500',
        ]);

        $prescription = DB::transaction(function () use ($data, $visit, $request) {
            $rx = $visit->prescription ?: $visit->prescription()->create(['doctor_id' => $this->myDoctorId($request), 'notes' => $data['notes'] ?? null]);
            if ($visit->prescription && isset($data['notes'])) {
                $rx->update(['notes' => $data['notes']]);
            }
            $rx->items()->createMany($data['items']);

            return $rx;
        });
        Audit::log($request, 'prescription_written', $visit);

        return response()->json($prescription->load('items')->toArray() + [
            'allergy_warnings' => $this->allergyWarnings($visit->patient, $data['items']),
        ], 201);
    }

    /** Non-blocking safety net: the medicine name appears in the patient's recorded allergies. */
    private function allergyWarnings(Patient $patient, array $items): array
    {
        $tokens = collect(preg_split('/[,;\n]+/', (string) $patient->allergies))->map(fn ($t) => mb_strtolower(trim($t)))->filter(fn ($t) => mb_strlen($t) >= 3);
        $hits = [];
        foreach ($items as $i) {
            $name = mb_strtolower($i['medicine_name']);
            foreach ($tokens as $t) {
                if (str_contains($name, $t) || str_contains($t, $name)) {
                    $hits[] = "{$i['medicine_name']} may conflict with the recorded allergy “{$t}”.";
                }
            }
        }

        return array_values(array_unique($hits));
    }

    public function removePrescriptionItem(Request $request, Visit $visit, int $item)
    {
        $this->ensureOwner($request, $visit);
        $this->ensureDraft($visit);
        abort_if(! $visit->prescription, 404);
        $visit->prescription->items()->whereKey($item)->firstOrFail()->delete();
        if ($visit->prescription->items()->count() === 0) {
            $visit->prescription->delete();
        }

        return response()->json(['message' => 'Removed.']);
    }

    // GET /api/prescriptions/{prescription} — printable (staff)
    public function prescription(Request $request, Prescription $prescription)
    {
        $prescription->load('items', 'doctor.user:id,name', 'doctor.department:id,name', 'visit.patient');
        $patient = $prescription->visit->patient;
        PatientAccess::authorize($request->user(), $patient);
        Audit::log($request, 'viewed_prescription', $prescription);

        return response()->json([
            'id' => $prescription->id, 'status' => $prescription->status, 'notes' => $prescription->notes, 'issued_at' => $prescription->created_at,
            'clinic' => config('app.name'), 'doctor' => $prescription->doctor?->user?->name, 'specialization' => $prescription->doctor?->specialization,
            'license_number' => $prescription->doctor?->license_number, 'department' => $prescription->doctor?->department?->name,
            'diagnosis' => $prescription->visit->diagnosis ?: $prescription->visit->assessment,
            'patient' => ['name' => $patient->first_name.' '.$patient->last_name, 'mrn' => $patient->mrn, 'date_of_birth' => $patient->date_of_birth?->toDateString(), 'allergies' => $patient->allergies],
            'items' => $prescription->items,
        ]);
    }

    // ───────────────────────── letters (sick note / referral) ─────────────────────────

    // POST /api/visits/{visit}/letters
    public function addLetter(Request $request, Visit $visit)
    {
        $this->ensureOwner($request, $visit);
        $type = $request->validate(['type' => 'required|in:sick_note,referral'])['type'];

        $data = $type === 'sick_note'
            ? $request->validate(['data.from_date' => 'required|date', 'data.to_date' => 'required|date|after_or_equal:data.from_date', 'data.note' => 'nullable|string|max:500', 'data.show_diagnosis' => 'boolean'])
            : $request->validate(['data.to_specialty' => 'required|string|max:120', 'data.to_doctor' => 'nullable|string|max:120', 'data.urgency' => 'required|in:routine,urgent,emergency', 'data.reason' => 'required|string|max:2000']);

        $letter = ClinicalLetter::create([
            'visit_id' => $visit->id, 'patient_id' => $visit->patient_id, 'doctor_id' => $visit->doctor_id,
            'type' => $type, 'data' => $data['data'], 'issued_at' => now(),
        ]);
        Audit::log($request, 'letter_issued', $letter, null, [], ['type' => $type]);
        Notify::patient($visit->patient->load('user'), 'visit_summary', 'A new letter was added to your medical records.', '/portal/records');

        return response()->json($letter, 201);
    }

    // GET /api/letters/{letter} — printable (staff)
    public function letter(Request $request, ClinicalLetter $letter)
    {
        PatientAccess::authorize($request->user(), $letter->patient_id);
        Audit::log($request, 'viewed_letter', $letter);

        return response()->json($this->letterPayload($letter));
    }

    public function letterPayload(ClinicalLetter $letter): array
    {
        $letter->load('patient', 'doctor.user:id,name', 'doctor.department:id,name', 'visit');
        $p = $letter->patient;
        $data = $letter->data;
        if ($letter->type === 'sick_note' && ! ($data['show_diagnosis'] ?? false)) {
            $diagnosis = null;
        } else {
            $diagnosis = $letter->visit?->diagnosis ?: $letter->visit?->assessment;
        }

        return [
            'id' => $letter->id, 'type' => $letter->type, 'issued_at' => $letter->issued_at, 'clinic' => config('app.name'),
            'doctor' => $letter->doctor?->user?->name, 'specialization' => $letter->doctor?->specialization,
            'license_number' => $letter->doctor?->license_number, 'department' => $letter->doctor?->department?->name,
            'patient' => ['name' => $p->first_name.' '.$p->last_name, 'mrn' => $p->mrn, 'date_of_birth' => $p->date_of_birth?->toDateString()],
            'data' => $data, 'diagnosis' => $diagnosis,
        ];
    }

    // ───────────────────────── lookups ─────────────────────────

    // GET /api/lookups/icd10?q=hypertension
    public function icd10(Request $request)
    {
        $q = trim((string) $request->validate(['q' => 'required|string|min:2|max:60'])['q']);
        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], mb_strtolower($q)).'%';

        return DB::table('icd10_codes')
            ->whereRaw("lower(replace(code, '.', '')) like ?", [mb_strtolower(str_replace('.', '', $q)).'%'])
            ->orWhereRaw('lower(code) like ?', [mb_strtolower($q).'%'])
            ->orWhereRaw('lower(description) like ?', [$like])
            ->orderByRaw('case when lower(code) like ? then 0 else 1 end', [mb_strtolower($q).'%'])
            ->orderBy('code')->limit(15)->get(['code', 'description']);
    }

    // ───────────────────────── history ─────────────────────────

    // GET /api/patients/{patient}/history
    public function patientHistory(Request $request, Patient $patient)
    {
        $user = $request->user();
        PatientAccess::authorize($user, $patient);
        Audit::log($request, 'viewed_history', $patient, null, [], PatientAccess::viaGlass($user, $patient) ? ['access' => 'break_glass'] : []);

        return $patient->visits()
            ->where(fn ($q) => $q->where('status', 'signed')->orWhere('doctor_id', $user->staffProfile?->id))
            ->with('doctor.user:id,name', 'prescription.items', 'letters')
            ->orderByDesc('visited_at')->limit(30)->get();
    }
}
