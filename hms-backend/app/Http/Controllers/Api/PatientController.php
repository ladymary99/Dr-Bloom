<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\AuditLog;
use App\Models\Patient;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    // GET /api/patients?search=ahmad&page=2
    public function index(Request $request)
    {
        $query = Patient::query();

        if ($this->isDoctor($request)) {
            $doctorId = $this->doctorProfileId($request);
            $query->where(function ($q) use ($doctorId) {
                $q->whereHas('appointments', fn($appointments) => $appointments->where('doctor_id', $doctorId))
                    ->orWhereHas('visits', fn($visits) => $visits->where('doctor_id', $doctorId))
                    ->orWhereHas('admissions', fn($admissions) => $admissions->where('doctor_id', $doctorId));
            });
        } elseif ($this->isNurse($request)) {
            $query->where(function ($q) {
                $q->whereHas('appointments')
                    ->orWhereHas('visits')
                    ->orWhereHas('admissions');
            });
        }

        $patients = $query
            ->when($request->search, function ($q, $search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('first_name', 'ilike', "%{$search}%")
                        ->orWhere('last_name', 'ilike', "%{$search}%")
                        ->orWhere('mrn', 'ilike', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(15);

        return response()->json($patients);
    }

    public function store(StorePatientRequest $request)
    {
        $patient = Patient::create($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'created',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'new_values' => $request->safe()->except(['national_id', 'phone']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($patient, 201);
    }

    public function show(Request $request, Patient $patient)
    {
        $this->ensureDoctorCanAccessPatient($request, $patient);

        AuditLog::create([   // hospital rule: viewing a record is ALWAYS logged
            'user_id' => $request->user()->id,
            'action' => 'viewed',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $patient->load(['appointments' => function ($query) use ($request) {
            if ($this->isDoctor($request)) {
                $query->where('doctor_id', $this->doctorProfileId($request));
            }
        }, 'appointments.doctor.user']);

        return response()->json($patient);
    }

    public function update(UpdatePatientRequest $request, Patient $patient)
    {
        $this->ensureDoctorCanAccessPatient($request, $patient);

        $old = $patient->only(['first_name', 'last_name', 'phone', 'blood_type']);
        $patient->update($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'updated',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'old_values' => $old,
            'new_values' => $request->safe()->except(['national_id', 'phone']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($patient->fresh());
    }

    public function destroy(Request $request, Patient $patient)
    {
        $this->ensureDoctorCanAccessPatient($request, $patient);

        $patient->delete();  // soft delete — data is never truly gone

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'deleted',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'old_values' => ['mrn' => $patient->mrn, 'name' => $patient->full_name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Patient archived (soft deleted)']);
    }

    private function isDoctor(Request $request): bool
    {
        return $request->user()->hasRole('doctor') && ! $request->user()->hasRole('admin');
    }

    private function isNurse(Request $request): bool
    {
        return $request->user()->hasRole('nurse') && ! $request->user()->hasRole('admin');
    }

    private function doctorProfileId(Request $request): int
    {
        $doctorId = $request->user()->staffProfile?->id;
        abort_if(! $doctorId, 403, 'No staff profile linked to this doctor account.');

        return $doctorId;
    }

    private function ensureDoctorCanAccessPatient(Request $request, Patient $patient): void
    {
        if (! $this->isDoctor($request)) {
            return;
        }

        $doctorId = $this->doctorProfileId($request);
        $hasAppointment = $patient->appointments()->where('doctor_id', $doctorId)->exists();
        $hasVisit = $patient->visits()->where('doctor_id', $doctorId)->exists();
        $hasAdmission = $patient->admissions()->where('doctor_id', $doctorId)->exists();

        abort_unless($hasAppointment || $hasVisit || $hasAdmission, 404);
    }
}