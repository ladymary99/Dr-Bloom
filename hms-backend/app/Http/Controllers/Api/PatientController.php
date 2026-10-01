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
        $patients = Patient::query()
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
        AuditLog::create([   // hospital rule: viewing a record is ALWAYS logged
            'user_id' => $request->user()->id,
            'action' => 'viewed',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($patient->load('appointments.doctor.user'));
    }

    public function update(UpdatePatientRequest $request, Patient $patient)
    {
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
}