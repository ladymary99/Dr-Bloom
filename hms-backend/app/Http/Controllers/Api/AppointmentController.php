<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\StaffProfile;
use App\Notifications\AppointmentBookedNotification;
use App\Services\BookingService;
use App\Support\Audit;
use App\Support\Notify;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AppointmentController extends Controller
{
    /** Allowed status moves. Closed states are final so history cannot be rewritten. */
    private const TRANSITIONS = [
        'scheduled' => ['confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
        'confirmed' => ['checked_in', 'completed', 'cancelled', 'no_show'],
        'checked_in' => ['completed', 'cancelled', 'no_show'],
        'completed' => [], 'cancelled' => [], 'no_show' => [],
    ];

    public function __construct(private BookingService $booking) {}

    // GET /api/appointments?doctor_id=1&status=scheduled&date=2026-10-02
    public function index(Request $request)
    {
        $doctorId = $this->doctorProfileId($request);
        $appointments = Appointment::query()
            ->with(['patient:id,mrn,first_name,last_name', 'doctor.user:id,name', 'department:id,name,code'])
            ->when($doctorId, fn($q, $v) => $q->where('doctor_id', $v))
            ->when(! $doctorId && $request->doctor_id, fn($q) => $q->where('doctor_id', $request->doctor_id))
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

        if ($request->user()->hasRole('doctor') && ! $request->user()->hasRole('admin')) {
            $data['doctor_id'] = $this->doctorProfileId($request);
        }

        $doctor = StaffProfile::findOrFail($data['doctor_id']);
        $data['duration_minutes'] ??= (int) ($doctor->slot_minutes ?: 30);
        $start = Carbon::parse($data['appointment_at']);

        // Reception may book outside the doctor's usual hours, but never on top of another visit.
        if ($this->overlaps($data['doctor_id'], $start, $data['duration_minutes'])) {
            return response()->json(['message' => 'Doctor already has an appointment in that time window.'], 422);
        }

        try {
            $appointment = Appointment::create($data + ['booked_by' => $request->user()->id])->load(['patient', 'doctor.user', 'department']);
        } catch (QueryException $e) {
            throw $this->booking->translate($e) instanceof \App\Exceptions\SlotUnavailableException
                ? \Illuminate\Validation\ValidationException::withMessages(['appointment_at' => ['Doctor already has an appointment in that time window.']])
                : $e;
        }
        Audit::log($request, 'appointment_booked', $appointment);

        // ── Notify doctor + patient ──
        $when = $start->format('D d M, H:i');
        $patientName = $appointment->patient
            ? "{$appointment->patient->first_name} {$appointment->patient->last_name}"
            : 'a patient';

        $appointment->doctor?->user?->notify(new AppointmentBookedNotification(
            $appointment->id,
            "New appointment: {$patientName} on {$when}"
        ));

        // patient user account (portal) — requires patient->user relation
        if ($appointment->patient) {
            Notify::patient($appointment->patient, 'appointment_confirmed',
                "Your appointment is confirmed for {$when}.", '/portal/appointments', 'Appointment confirmed: '.$when);
        }

        return response()->json($appointment, 201);
    }

    public function show(Request $request, Appointment $appointment)
    {
        $this->ensureDoctorOwnsAppointment($request, $appointment);

        return response()->json($appointment->load(['patient', 'doctor.user', 'department', 'visit.prescription.items']));
    }

    // PATCH status: scheduled -> confirmed -> checked_in -> completed (or cancelled/no_show)
    public function update(Request $request, Appointment $appointment)
    {
        $this->ensureDoctorOwnsAppointment($request, $appointment);

        $data = $request->validate([
            'status' => 'sometimes|in:scheduled,confirmed,checked_in,completed,cancelled,no_show',
            'appointment_at' => 'sometimes|date',
            'notes' => 'nullable|string|max:1000',
            'visit_type' => 'sometimes|in:in_person,online',
            'meeting_url' => 'nullable|url|max:500',
            'cancellation_reason' => 'nullable|string|max:300',
        ]);

        $oldStatus = $appointment->status;
        $newStatus = $data['status'] ?? $oldStatus;
        if ($newStatus !== $oldStatus && ! in_array($newStatus, self::TRANSITIONS[$oldStatus] ?? [], true)) {
            return response()->json(['message' => "An appointment that is {$oldStatus} cannot be changed to {$newStatus}."], 422);
        }
        if (isset($data['appointment_at']) && in_array($oldStatus, ['completed', 'cancelled', 'no_show'], true)) {
            return response()->json(['message' => 'Closed appointments cannot be rescheduled.'], 422);
        }

        $moved = false;
        if (isset($data['appointment_at'])) {
            $newStart = Carbon::parse($data['appointment_at']);
            $moved = ! $newStart->equalTo($appointment->appointment_at);
            if ($moved) {
                if ($newStart->isPast()) {
                    return response()->json(['message' => 'The new time must be in the future.'], 422);
                }
                if ($this->overlaps($appointment->doctor_id, $newStart, $appointment->duration_minutes, $appointment->id)) {
                    return response()->json(['message' => 'Doctor already has an appointment in that time window.'], 422);
                }
                $data['rescheduled_from'] = $appointment->appointment_at;
                $data['reminder_24h_sent_at'] = null;
                $data['reminder_1h_sent_at'] = null;
            }
        }
        if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
            $data += ['cancelled_at' => now(), 'cancelled_by' => $request->user()->id];
        }

        try {
            $appointment->update($data);
        } catch (QueryException $e) {
            if ($this->booking->translate($e) instanceof \App\Exceptions\SlotUnavailableException) {
                return response()->json(['message' => 'Doctor already has an appointment in that time window.'], 422);
            }
            throw $e;
        }
        if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
            \App\Models\Invoice::where('appointment_id', $appointment->id)->where('status', 'pending')->update(['status' => 'cancelled']);
        }
        Audit::log($request, 'appointment_updated', $appointment, null, ['status' => $oldStatus], $data);

        // keep the patient in the loop
        $patient = $appointment->patient()->with('user')->first();
        $when = $appointment->fresh()->appointment_at->format('D d M, H:i');
        if ($patient) {
            if ($moved) {
                Notify::patient($patient, 'appointment_rescheduled', "Your appointment was moved to {$when}.", '/portal/appointments', 'Appointment rescheduled');
            } elseif ($newStatus !== $oldStatus && $newStatus === 'confirmed') {
                Notify::patient($patient, 'appointment_confirmed', "Your appointment on {$when} is confirmed.", '/portal/appointments', 'Appointment confirmed');
            } elseif ($newStatus !== $oldStatus && $newStatus === 'cancelled') {
                Notify::patient($patient, 'appointment_cancelled', "Your appointment on {$when} was cancelled by the clinic.", '/portal/appointments', 'Appointment cancelled');
            }
        }

        return response()->json($appointment->fresh());
    }

    private function overlaps(int $doctorId, Carbon $start, int $minutes, ?string $ignoreId = null): bool
    {
        return Appointment::where('doctor_id', $doctorId)
            ->whereIn('status', Appointment::ACTIVE)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->where('appointment_at', '<', $start->copy()->addMinutes($minutes))
            ->whereRaw("appointment_at + (duration_minutes * interval '1 minute') > ?", [$start->format('Y-m-d H:i:s')])
            ->exists();
    }

    private function doctorProfileId(Request $request): ?int
    {
        if (! $request->user()->hasRole('doctor') || $request->user()->hasRole('admin')) {
            return null;
        }

        $doctorId = $request->user()->staffProfile?->id;
        abort_if(! $doctorId, 403, 'No staff profile linked to this doctor account.');

        return $doctorId;
    }

    private function ensureDoctorOwnsAppointment(Request $request, Appointment $appointment): void
    {
        $doctorId = $this->doctorProfileId($request);
        abort_if($doctorId && $appointment->doctor_id !== $doctorId, 404);
    }
}