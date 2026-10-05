<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Setting;
use App\Models\StaffProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PortalController extends Controller
{
    private function myPatient(Request $request): Patient
    {
        $patient = $request->user()->patient;
        abort_if(! $patient, 403, 'No patient profile linked to this account.');

        return $patient;
    }

    public function me(Request $request)
    {
        $patient = $this->myPatient($request);

        return response()->json([
            'patient' => $patient,
            'next_appointment' => $patient->appointments()
                ->with('doctor.user:id,name', 'department:id,name')
                ->where('appointment_at', '>=', now())
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->orderBy('appointment_at')
                ->first(),
            'stats' => [
                'upcoming' => $patient->appointments()->where('appointment_at', '>=', now())
                    ->whereIn('status', ['scheduled', 'confirmed'])->count(),
                'past' => $patient->appointments()->where('appointment_at', '<', now())->count(),
                'visits' => $patient->visits()->count(),
                'prescriptions' => Prescription::whereIn('visit_id', $patient->visits()->select('id'))->count(),
                'pending_bills' => $patient->invoices()->where('status', 'pending')->count(),
            ],
        ]);
    }

    public function appointments(Request $request)
    {
        return $this->myPatient($request)->appointments()
            ->with('doctor.user:id,name', 'department:id,name')
            ->orderByDesc('appointment_at')
            ->limit(50)
            ->get();
    }

    public function book(Request $request)
    {
        $data = $request->validate([
            'doctor_id' => 'required|exists:staff_profiles,id',
            'appointment_at' => 'required|date|after:now',
            'reason' => 'nullable|string|max:500',
        ]);

        $patient = $this->myPatient($request);
        $doctor = StaffProfile::with('user:id,name')->findOrFail($data['doctor_id']);
        abort_if($doctor->position !== 'doctor' || ! $doctor->is_active, 422, 'This doctor is not available for booking.');

        $start = Carbon::parse($data['appointment_at']);
        $conflict = Appointment::where('doctor_id', $doctor->id)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('appointment_at', [
                $start->copy()->subMinutes(30),
                $start->copy()->addMinutes(30),
            ])
            ->exists();

        if ($conflict) {
            return response()->json(['message' => 'Doctor is not available at that time. Try another slot.'], 422);
        }

        $appointment = DB::transaction(function () use ($data, $patient, $doctor, $request) {
            $appointment = Appointment::create([
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'department_id' => $doctor->department_id,
                'appointment_at' => $data['appointment_at'],
                'status' => 'scheduled',
                'reason' => $data['reason'] ?? 'Online booking',
                'notes' => 'Booked by patient online',
            ]);

            $fee = (float) (Setting::get('consultation_fee') ?? 0);
            if ($fee > 0) {
                Invoice::create([
                    'patient_id' => $patient->id,
                    'department_id' => $doctor->department_id,
                    'doctor_id' => $doctor->id,
                    'description' => 'Consultation fee - ' . $doctor->user->name,
                    'amount' => $fee,
                    'status' => 'pending',
                    'source' => 'online',
                    'created_by' => $request->user()->id,
                ]);
            }

            return $appointment;
        });

        return response()->json($appointment->load('doctor.user', 'department'), 201);
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        $patient = $this->myPatient($request);
        abort_if($appointment->patient_id !== $patient->id, 403);
        abort_if(! in_array($appointment->status, ['scheduled', 'confirmed'], true), 422, 'This appointment cannot be cancelled.');

        $appointment->update(['status' => 'cancelled']);

        return $appointment->fresh();
    }

    public function records(Request $request)
    {
        return $this->myPatient($request)->visits()
            ->with('doctor.user:id,name', 'prescription.items')
            ->orderByDesc('visited_at')
            ->get();
    }

    public function invoices(Request $request)
    {
        return $this->myPatient($request)->invoices()
            ->with('department:id,name', 'doctor.user:id,name')
            ->orderByDesc('created_at')
            ->get();
    }
}
