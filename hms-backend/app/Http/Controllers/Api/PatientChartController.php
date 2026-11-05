<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Patient;
use App\Services\PatientAccess;
use App\Support\Audit;
use Illuminate\Http\Request;

/** GET /api/patients/{patient}/chart — everything a clinician needs on one screen (access-checked, audited). */
class PatientChartController extends Controller
{
    public function show(Request $request, Patient $patient)
    {
        $user = $request->user();
        PatientAccess::authorize($user, $patient);
        $glass = PatientAccess::viaGlass($user, $patient);
        Audit::log($request, $glass ? 'viewed_break_glass' : 'viewed', $patient, null, [], $glass ? ['screen' => 'chart'] : ['screen' => 'chart']);

        $myDoctor = $user->staffProfile?->id;
        $finance = $user->hasRole('admin') || $user->hasRole('receptionist') || $user->can('manage payments');

        $visits = $patient->visits()->with('doctor.user:id,name', 'prescription.items', 'letters', 'addenda.author:id,name')
            ->where(fn ($q) => $q->where('status', 'signed')->orWhere('doctor_id', $myDoctor))
            ->orderByDesc('visited_at')->limit(50)->get();

        // vitals trend from signed visits, oldest → newest
        $vitals = $visits->where('status', 'signed')->filter(fn ($v) => ! empty($v->vitals))->sortBy('visited_at')->take(-12)->map(fn ($v) => [
            'at' => $v->visited_at->toDateString(), 'bp_systolic' => $v->vitals['bp_systolic'] ?? null, 'bp_diastolic' => $v->vitals['bp_diastolic'] ?? null,
            'pulse' => $v->vitals['pulse'] ?? null, 'weight' => $v->vitals['weight'] ?? null, 'temperature' => $v->vitals['temperature'] ?? null, 'spo2' => $v->vitals['spo2'] ?? null,
        ])->values();

        $prescriptions = $visits->filter(fn ($v) => $v->prescription)->map(fn ($v) => [
            'id' => $v->prescription->id, 'status' => $v->prescription->status, 'issued_at' => $v->prescription->created_at,
            'doctor' => $v->doctor?->user?->name, 'diagnosis' => $v->diagnosis ?: $v->assessment, 'items' => $v->prescription->items,
        ])->values();

        $appointments = $patient->appointments()->with('doctor.user:id,name')
            ->when($myDoctor && PatientAccess::restricted($user) && ! $glass, fn ($q) => $q->where('doctor_id', $myDoctor))
            ->orderByDesc('appointment_at')->limit(15)->get();

        return response()->json([
            'patient' => $patient->only(['id', 'mrn', 'first_name', 'last_name', 'date_of_birth', 'gender', 'blood_type', 'allergies', 'chronic_conditions',
                'current_medications', 'phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
                'insurance_provider', 'preferred_language']) + ['age' => $patient->date_of_birth?->age],
            'access' => $glass ? 'break_glass' : 'care_team',
            'next_appointment' => $appointments->first(fn ($a) => in_array($a->status, Appointment::ACTIVE, true) && $a->appointment_at->isFuture()),
            'appointments' => $appointments,
            'visits' => $visits->map(fn ($v) => [
                'id' => $v->id, 'visited_at' => $v->visited_at, 'status' => $v->status, 'doctor' => $v->doctor?->user?->name, 'mine' => $v->doctor_id === $myDoctor,
                'chief_complaint' => $v->chief_complaint, 'diagnosis' => $v->diagnosis ?: $v->assessment, 'diagnosis_codes' => $v->diagnosis_codes, 'appointment_id' => $v->appointment_id,
                'letters' => $v->letters->map(fn ($l) => ['id' => $l->id, 'type' => $l->type, 'issued_at' => $l->issued_at]),
            ]),
            'vitals_trend' => $vitals,
            'prescriptions' => $prescriptions,
            'lab_tests' => $patient->labTests()->with('doctor.user:id,name')->orderByDesc('created_at')->limit(30)->get(),
            'vaccinations' => $patient->vaccinations()->orderByDesc('administered_on')->get(),
            'documents_count' => $patient->documents()->count(),
            'admission' => $patient->admissions()->with('bed.ward:id,name')->where('status', 'admitted')->first(),
            // billing summary only for roles that handle money; a doctor does not need it
            'billing' => $finance ? [
                'outstanding' => (float) $patient->invoices()->whereIn('status', ['pending', 'partial'])->selectRaw('coalesce(sum(amount - amount_paid), 0) as o')->value('o'),
                'paid' => (float) $patient->invoices()->sum('amount_paid'),
                'open_invoices' => $patient->invoices()->whereIn('status', ['pending', 'partial'])->count(),
            ] : null,
        ]);
    }
}
