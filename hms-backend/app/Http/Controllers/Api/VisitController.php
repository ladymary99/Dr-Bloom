<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VisitController extends Controller
{
    // POST /api/visits — start consultation
    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'appointment_id' => 'nullable|uuid|exists:appointments,id',
            'chief_complaint' => 'nullable|string|max:1000',
            'vitals' => 'nullable|array',
            'diagnosis' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
            'type' => 'in:opd,ipd,emergency',
        ]);

        $doctorId = $request->user()->staffProfile?->id;
        if (! $doctorId) {
            return response()->json(['message' => 'No staff profile linked to this account.'], 403);
        }

        $visit = DB::transaction(function () use ($data, $doctorId) {
            $visit = Visit::create([
                'patient_id' => $data['patient_id'],
                'appointment_id' => $data['appointment_id'] ?? null,
                'doctor_id' => $doctorId,
                'visited_at' => now(),
                'type' => $data['type'] ?? 'opd',
                'chief_complaint' => $data['chief_complaint'] ?? null,
                'vitals' => $data['vitals'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            if (! empty($data['appointment_id'])) {
                Appointment::where('id', $data['appointment_id'])->update(['status' => 'completed']);
            }

            return $visit;
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'created',
            'auditable_type' => Visit::class,
            'auditable_id' => $visit->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($visit, 201);
    }

    // POST /api/visits/{visit}/prescriptions — e-prescription with items
    public function addPrescription(Request $request, Visit $visit)
    {
        if ($visit->prescription) {
            return response()->json(['message' => 'This visit already has a prescription.'], 422);
        }

        $data = $request->validate([
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.medicine_name' => 'required|string|max:150',
            'items.*.dosage' => 'required|string|max:50',
            'items.*.frequency' => 'required|string|max:50',
            'items.*.duration_days' => 'nullable|integer|min:1|max:365',
            'items.*.instructions' => 'nullable|string|max:500',
        ]);

        $doctorId = $request->user()->staffProfile?->id;

        $prescription = DB::transaction(function () use ($data, $visit, $doctorId) {
            $prescription = $visit->prescription()->create([
                'doctor_id' => $doctorId,
                'notes' => $data['notes'] ?? null,
            ]);
            $prescription->items()->createMany($data['items']);
            return $prescription;
        });

        return response()->json($prescription->load('items'), 201);
    }

    // GET /api/patients/{patient}/history — chart history
    public function patientHistory(Patient $patient)
    {
        return $patient->visits()
            ->with('doctor.user:id,name', 'prescription.items')
            ->orderByDesc('visited_at')
            ->limit(20)
            ->get();
    }
}