<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AppointmentController extends Controller
{
    // GET /api/appointments?doctor_id=1&status=scheduled&date=2026-10-02
    public function index(Request $request)
    {
        $appointments = Appointment::query()
            ->with(['patient:id,mrn,first_name,last_name', 'doctor.user:id,name', 'department:id,name,code'])
            ->when($request->doctor_id, fn($q, $v) => $q->where('doctor_id', $v))
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->date, fn($q, $v) => $q
                ->where('appointment_at', '>=', Carbon::parse($v)->startOfDay())
                ->where('appointment_at', '<', Carbon::parse($v)->startOfDay()->addDay()))
            ->orderBy('appointment_at')
            ->paginate(20);

        return response()->json($appointments);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'doctor_id' => 'required|exists:staff_profiles,id',
            'department_id' => 'nullable|exists:departments,id',
            'appointment_at' => 'required|date|after:now',
            'duration_minutes' => 'integer|min:5|max:240',
            'reason' => 'nullable|string|max:500',
        ]);

        // Double-booking guard
        $start = Carbon::parse($data['appointment_at']);
        $conflict = Appointment::where('doctor_id', $data['doctor_id'])
            ->where('status', '!=', 'cancelled')
            ->whereBetween('appointment_at', [
                $start->copy()->subMinutes($data['duration_minutes'] ?? 30),
                $start->copy()->addMinutes($data['duration_minutes'] ?? 30),
            ])->exists();

        if ($conflict) {
            return response()->json(['message' => 'Doctor already has an appointment in that time window.'], 422);
        }

        return response()->json(Appointment::create($data)->load(['patient', 'doctor.user', 'department']), 201);
    }

    public function show(Appointment $appointment)
    {
        return response()->json($appointment->load(['patient', 'doctor.user', 'department', 'visit.prescription.items']));
    }

    // PATCH status: scheduled -> confirmed -> checked_in -> completed (or cancelled/no_show)
    public function update(Request $request, Appointment $appointment)
    {
        $data = $request->validate([
            'status' => 'sometimes|in:scheduled,confirmed,checked_in,completed,cancelled,no_show',
            'appointment_at' => 'sometimes|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $appointment->update($data);

        return response()->json($appointment->fresh());
    }
}