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
        'scheduled' => ['confirmed', 'checked_in', 'waiting', 'in_consultation', 'completed', 'cancelled', 'no_show'],
        'confirmed' => ['checked_in', 'waiting', 'in_consultation', 'completed', 'cancelled', 'no_show'],
        'checked_in' => ['waiting', 'in_consultation', 'completed', 'cancelled', 'no_show'],
        'waiting' => ['in_consultation', 'completed', 'cancelled', 'no_show'],
        'in_consultation' => ['waiting', 'completed'],
        'completed' => [], 'cancelled' => [], 'no_show' => [],
    ];

    public function __construct(private BookingService $booking) {}

    // GET /api/appointments?when=upcoming|today|past|needs_update|all&doctor_id=&status=&date=&search=
    public function index(Request $request)
    {
        $doctorId = $this->doctorProfileId($request);
        $when = $request->query('when', 'upcoming');
        $todayStart = Carbon::today();

        $base = fn () => Appointment::query()
            ->when($doctorId, fn ($q, $v) => $q->where('doctor_id', $v))
            ->when(! $doctorId && $request->doctor_id, fn ($q) => $q->where('doctor_id', $request->doctor_id));

        $stale = fn ($q) => $q->whereIn('status', Appointment::ACTIVE)
            ->whereRaw("appointment_at + ((duration_minutes + 60) * interval '1 minute') < ?", [now()->format('Y-m-d H:i:s')]);

        $query = $base()
            ->with(['patient:id,mrn,first_name,last_name,date_of_birth,gender', 'doctor.user:id,name', 'department:id,name,code'])
            ->when($request->status, fn ($q, $v) => $q->where('status', $v))
            ->when($request->date, fn ($q, $v) => $q
                ->where('appointment_at', '>=', Carbon::parse($v)->startOfDay())
                ->where('appointment_at', '<', Carbon::parse($v)->startOfDay()->addDay()))
            ->when($request->search, fn ($q, $term) => $q->whereHas('patient', fn ($p) => $p
                ->where('first_name', 'ilike', "%{$term}%")->orWhere('last_name', 'ilike', "%{$term}%")->orWhere('mrn', 'ilike', "%{$term}%")
                ->orWhereRaw("(first_name || ' ' || last_name) ilike ?", ["%{$term}%"])));

        match ($when) {
            'today' => $query->where('appointment_at', '>=', $todayStart)->where('appointment_at', '<', $todayStart->copy()->addDay())->orderBy('appointment_at'),
            'past' => $query->where(fn ($q) => $q->where('appointment_at', '<', $todayStart)->orWhereIn('status', ['completed', 'cancelled', 'no_show']))->orderByDesc('appointment_at'),
            'needs_update' => $stale($query)->orderBy('appointment_at'),
            'all' => $query->orderBy('appointment_at'),
            // default: from today on, still live
            default => $query->where('appointment_at', '>=', $todayStart)->whereIn('status', Appointment::ACTIVE)->orderBy('appointment_at'),
        };

        // one consistent set of numbers for the tabs (the same filters the lists use)
        $counts = [
            'upcoming' => $base()->where('appointment_at', '>=', $todayStart)->whereIn('status', Appointment::ACTIVE)->count(),
            'today' => $base()->where('appointment_at', '>=', $todayStart)->where('appointment_at', '<', $todayStart->copy()->addDay())->count(),
            'past' => $base()->where(fn ($q) => $q->where('appointment_at', '<', $todayStart)->orWhereIn('status', ['completed', 'cancelled', 'no_show']))->count(),
            'needs_update' => $stale($base())->count(),
            'all' => $base()->count(),
        ];

        return response()->json($query->paginate(min(max((int) $request->query('per', 20), 1), 100))->toArray() + ['counts' => $counts]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'doctor_id' => 'required|exists:staff_profiles,id',
            'appointment_at' => 'required|date|after:now',
            'reason' => 'nullable|string|max:500',
            'visit_type' => 'nullable|in:in_person,online',
            'override' => 'nullable|boolean',
            'override_reason' => 'required_if:override,true|nullable|string|min:5|max:300',
        ]);

        $user = $request->user();
        if ($user->hasRole('doctor') && ! $user->hasRole('admin')) {
            $data['doctor_id'] = $this->doctorProfileId($request);
        }

        $doctor = StaffProfile::with('user')->findOrFail($data['doctor_id']);
        $patient = \App\Models\Patient::findOrFail($data['patient_id']);
        $start = \Carbon\CarbonImmutable::parse($data['appointment_at']);

        // The doctor's published schedule is enforced on the server: on the slot grid, inside working hours, not in a
        // break or day off, within the daily cap. Only front desk / admin may override, with a reason that is logged.
        $override = $request->boolean('override');
        abort_if($override && ! ($user->hasRole('admin') || $user->hasRole('receptionist')), 403, 'Only the front desk or an administrator can book outside the doctor\'s schedule.');

        try {
            $appointment = $this->booking->book($patient, $doctor, $start, (string) ($data['reason'] ?? ''), $data['visit_type'] ?? 'in_person', $user, false, ! $override)
                ->load(['patient', 'doctor.user', 'department']);
        } catch (\App\Exceptions\SlotUnavailableException $e) {
            throw \Illuminate\Validation\ValidationException::withMessages(['appointment_at' => [$e->getMessage()]]);
        }
        if ($override) {
            Audit::log($request, 'appointment_schedule_override', $appointment, null, [], ['reason' => $data['override_reason']]);
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
            'status' => 'sometimes|in:scheduled,confirmed,checked_in,waiting,in_consultation,completed,cancelled,no_show',
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
        if (isset($data['appointment_at']) && ! in_array($oldStatus, Appointment::OPEN, true)) {
            return response()->json(['message' => 'Closed appointments cannot be rescheduled.'], 422);
        }

        if ($newStatus === 'completed' && $oldStatus !== 'completed'
            && \App\Models\Visit::where('appointment_id', $appointment->id)->where('status', 'draft')->exists()) {
            return response()->json(['message' => 'There is an unsigned visit note for this appointment. Finish and sign it to complete the visit.'], 422);
        }
        if ($newStatus !== $oldStatus) {
            $stamp = match ($newStatus) {
                'checked_in', 'waiting' => $appointment->checked_in_at ? [] : ['checked_in_at' => now()],
                'in_consultation' => ['consultation_started_at' => now()] + ($appointment->checked_in_at ? [] : ['checked_in_at' => now()]),
                'completed' => ['completed_at' => now()],
                default => [],
            };
            $data += $stamp;
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
                $user = $request->user();
                if ($request->boolean('override')) {
                    abort_unless($user->hasRole('admin') || $user->hasRole('receptionist'), 403, 'Only the front desk or an administrator can move an appointment outside the doctor\'s schedule.');
                    $request->validate(['override_reason' => 'required|string|min:5|max:300']);
                    Audit::log($request, 'appointment_schedule_override', $appointment, null, [], ['reason' => $request->override_reason]);
                } else {
                    try {
                        $this->booking->assertBookable($appointment->doctor()->with('user')->first(), \Carbon\CarbonImmutable::parse($data['appointment_at']), $appointment->id, $appointment->visit_type);
                    } catch (\App\Exceptions\SlotUnavailableException $e) {
                        return response()->json(['message' => $e->getMessage(), 'errors' => ['appointment_at' => [$e->getMessage()]]], 422);
                    }
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

    // GET /api/appointment-slots/{doctor}?from=&to=  — what a staff member can actually book
    public function slots(Request $request, StaffProfile $doctor)
    {
        abort_unless($doctor->position === 'doctor' && $doctor->is_active, 404);
        $d = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d', 'ignore' => 'nullable|uuid']);

        return response()->json([
            'slot_minutes' => (int) ($doctor->slot_minutes ?: 30),
            'accepts_online' => (bool) $doctor->accepts_online,
            'accepts_in_person' => (bool) $doctor->accepts_in_person,
            'days' => $this->booking->availability($doctor, $d['from'] ?? null, $d['to'] ?? null, $d['ignore'] ?? null),
        ]);
    }

    // POST /api/appointments/resolve-stale  {status: no_show|completed}  — front desk / admin clean-up of past, still-open appointments
    public function resolveStale(Request $request)
    {
        $user = $request->user();
        abort_unless($user->hasRole('admin') || $user->hasRole('receptionist'), 403, 'Only the front desk or an administrator can do this in bulk.');
        $status = $request->validate(['status' => 'required|in:no_show,completed'])['status'];

        // never touch an appointment with an unsigned note: that visit is still the doctor's to finish
        $query = Appointment::whereIn('status', Appointment::ACTIVE)
            ->whereRaw("appointment_at + ((duration_minutes + 60) * interval '1 minute') < ?", [now()->format('Y-m-d H:i:s')])
            ->whereDoesntHave('visit', fn ($v) => $v->where('status', 'draft'));
        $count = (clone $query)->count();
        $query->update(['status' => $status, 'completed_at' => $status === 'completed' ? now() : null]);
        Audit::log($request, 'appointments_bulk_resolved', Appointment::class, null, [], ['status' => $status, 'count' => $count]);

        return response()->json(['updated' => $count]);
    }
}
