<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\SlotUnavailableException;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Setting;
use App\Models\StaffProfile;
use App\Notifications\AppointmentBookedNotification;
use App\Services\BookingService;
use App\Support\Audit;
use App\Support\Calendar\IcsBuilder;
use App\Support\Notify;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PortalController extends Controller
{
    public function __construct(private BookingService $booking) {}

    private function myPatient(Request $request): Patient
    {
        $patient = $request->user()->patient;
        abort_if(! $patient, 403, 'No patient profile linked to this account.');

        return $patient;
    }

    // ───────────────────────── dashboard ─────────────────────────

    public function me(Request $request)
    {
        $patient = $this->myPatient($request);
        $upcoming = fn () => $patient->appointments()->where('appointment_at', '>=', now())->whereIn('status', Appointment::ACTIVE);
        $next = $upcoming()->with('doctor.user:id,name', 'department:id,name')->orderBy('appointment_at')->first();

        $profileFields = ['phone', 'date_of_birth', 'gender', 'address', 'blood_type', 'emergency_contact_name',
            'emergency_contact_phone', 'allergies', 'insurance_provider'];
        $filled = collect($profileFields)->filter(fn ($f) => filled($patient->{$f}))->count();

        return response()->json([
            'patient' => $patient,
            'next_appointment' => $next ? $this->present($next) : null,
            'profile_completion' => (int) round($filled / count($profileFields) * 100),
            'needs_consent' => ! $patient->privacy_accepted_at
                || $patient->privacy_policy_version !== Setting::get('privacy_policy_version', '2026-10'),
            'stats' => [
                'upcoming' => $upcoming()->count(),
                'past' => $patient->appointments()->where('appointment_at', '<', now())->count(),
                'visits' => $patient->visits()->count(),
                'prescriptions' => Prescription::whereIn('visit_id', $patient->visits()->select('id'))->count(),
                'pending_bills' => $patient->invoices()->whereIn('status', ['pending', 'partial'])->count(),
                'unread_messages' => $patient->messageThreads()
                    ->whereHas('messages', fn ($m) => $m->whereNull('read_at')->where('sender_id', '!=', $request->user()->id))->count(),
                'new_results' => $patient->labTests()->whereNotNull('released_at')->where('released_at', '>=', now()->subDays(14))->count(),
            ],
        ]);
    }

    // ───────────────────────── doctors & availability ─────────────────────────

    public function doctorFilters()
    {
        return response()->json([
            'departments' => Department::orderBy('name')->get(['id', 'name']),
            'specializations' => StaffProfile::where('position', 'doctor')->where('is_active', true)
                ->whereNotNull('specialization')->distinct()->orderBy('specialization')->pluck('specialization'),
            'languages' => StaffProfile::where('position', 'doctor')->where('is_active', true)
                ->whereNotNull('languages')->pluck('languages')
                ->flatMap(fn ($l) => array_map('trim', explode(',', $l)))->unique()->sort()->values(),
        ]);
    }

    public function doctors(Request $request)
    {
        $request->validate(['q' => 'nullable|string|max:80', 'department_id' => 'nullable|integer', 'specialization' => 'nullable|string|max:120', 'language' => 'nullable|string|max:40']);

        $doctors = StaffProfile::with('user:id,name,avatar_path', 'department:id,name')
            ->where('position', 'doctor')->where('is_active', true)
            ->when($request->q, function ($q, $term) {
                $q->where(fn ($qq) => $qq
                    ->whereHas('user', fn ($u) => $u->where('name', 'ilike', "%{$term}%"))
                    ->orWhere('specialization', 'ilike', "%{$term}%")
                    ->orWhereHas('department', fn ($d) => $d->where('name', 'ilike', "%{$term}%")));
            })
            ->when($request->department_id, fn ($q, $v) => $q->where('department_id', $v))
            ->when($request->specialization, fn ($q, $v) => $q->where('specialization', $v))
            ->when($request->language, fn ($q, $v) => $q->where('languages', 'ilike', "%{$v}%"))
            ->limit(50)->get();

        return response()->json($doctors->map(function (StaffProfile $d) {
            $next = collect($this->booking->availability($d, null, null))->map(fn ($times, $date) => "$date $times[0]")->first();

            return $this->doctorCard($d) + ['next_available' => $next];
        })->sortBy(fn ($d) => $d['next_available'] ?? '9999')->values());
    }

    public function doctor(StaffProfile $doctor)
    {
        abort_unless($doctor->position === 'doctor' && $doctor->is_active, 404);
        $doctor->load('user:id,name,avatar_path', 'department:id,name');

        return response()->json($this->doctorCard($doctor) + [
            'working_days' => $doctor->working_days ?? [1, 2, 3, 4, 5],
            'working_hours' => $doctor->working_hours ?: BookingService::DEFAULT_HOURS,
        ]);
    }

    public function doctorPhoto(StaffProfile $doctor)
    {
        $path = $doctor->user?->avatar_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path));
    }

    public function slots(Request $request, StaffProfile $doctor)
    {
        $data = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d']);
        abort_unless($doctor->position === 'doctor' && $doctor->is_active, 404);

        return response()->json([
            'doctor_id' => $doctor->id,
            'slot_minutes' => (int) ($doctor->slot_minutes ?: 30),
            'fee' => $this->booking->fee($doctor),
            'days' => $this->booking->availability($doctor, $data['from'] ?? null, $data['to'] ?? null, $request->query('ignore')),
        ]);
    }

    private function doctorCard(StaffProfile $d): array
    {
        return [
            'id' => $d->id,
            'name' => $d->user?->name,
            'specialization' => $d->specialization,
            'department' => $d->department?->name,
            'department_id' => $d->department_id,
            'bio' => $d->bio,
            'languages' => $d->languages ? array_map('trim', explode(',', $d->languages)) : [],
            'years_experience' => $d->years_experience,
            'fee' => $this->booking->fee($d),
            'slot_minutes' => (int) ($d->slot_minutes ?: 30),
            'has_photo' => (bool) $d->user?->avatar_path,
        ];
    }

    // ───────────────────────── appointments ─────────────────────────

    public function appointments(Request $request)
    {
        return $this->myPatient($request)->appointments()
            ->with('doctor.user:id,name', 'department:id,name')
            ->orderByDesc('appointment_at')
            ->limit(100)
            ->get()
            ->map(fn ($a) => $this->present($a));
    }

    public function book(Request $request)
    {
        $patient = $this->myPatient($request);
        $data = $request->validate([
            'doctor_id' => 'required|integer|exists:staff_profiles,id',
            'slot' => ['required', 'date_format:Y-m-d H:i'],
            'reason' => 'required|string|min:3|max:500',
            'visit_type' => 'nullable|in:in_person,online',
        ]);

        if (! $patient->privacy_accepted_at) {
            return response()->json(['message' => 'Please accept the privacy policy before booking.', 'code' => 'consent_required'], 403);
        }

        $start = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['slot']);
        $doctor = StaffProfile::with('user')->findOrFail($data['doctor_id']);

        // a patient cannot be in two places at once, and we cap runaway bookings
        $overlap = $patient->appointments()->whereIn('status', Appointment::ACTIVE)
            ->where('appointment_at', '<', $start->addMinutes((int) ($doctor->slot_minutes ?: 30)))
            ->whereRaw("appointment_at + (duration_minutes * interval '1 minute') > ?", [$start])->exists();
        if ($overlap) {
            return response()->json(['message' => 'You already have an appointment at that time.'], 422);
        }
        if ($patient->appointments()->whereIn('status', Appointment::ACTIVE)->where('appointment_at', '>=', now())->count() >= 10) {
            return response()->json(['message' => 'You have reached the maximum of 10 upcoming appointments.'], 422);
        }

        try {
            $appointment = $this->booking->book($patient, $doctor, $start, $data['reason'], $data['visit_type'] ?? 'in_person', $request->user());
        } catch (SlotUnavailableException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'slot_unavailable'], 409);
        }

        $when = $start->format('D, M j \a\t H:i');
        $doctor->user?->notify(new AppointmentBookedNotification($appointment->id,
            "New appointment: {$patient->first_name} {$patient->last_name} on {$when}"));
        Notify::patient($patient, 'appointment_confirmed',
            "Your appointment with Dr. {$doctor->user?->name} is booked for {$when}.", '/portal/appointments',
            'Appointment booked: '.$when);
        Audit::log($request, 'appointment_booked', $appointment, null, [], ['at' => $start->toDateTimeString(), 'doctor_id' => $doctor->id]);

        return response()->json($this->present($appointment->load('doctor.user:id,name', 'department:id,name')), 201);
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        $patient = $this->myPatient($request);
        abort_if($appointment->patient_id !== $patient->id, 403);
        abort_if(! in_array($appointment->status, ['scheduled', 'confirmed'], true), 422, 'This appointment can no longer be cancelled.');

        if (! $this->booking->patientMayModify($appointment)) {
            return response()->json([
                'message' => "Appointments can only be cancelled at least {$this->booking->cutoffHours()} hours in advance. Please call the clinic.",
                'code' => 'cutoff_passed',
            ], 422);
        }

        $reason = $request->validate(['reason' => 'nullable|string|max:300'])['reason'] ?? null;
        $this->booking->cancel($appointment, $request->user(), $reason);

        $appointment->doctor?->user?->notify(new AppointmentBookedNotification($appointment->id,
            "Appointment cancelled by {$patient->first_name} {$patient->last_name} ({$appointment->appointment_at->format('D, M j H:i')})"));
        Notify::patient($patient, 'appointment_cancelled', 'Your appointment was cancelled.', '/portal/appointments');
        Audit::log($request, 'appointment_cancelled', $appointment);

        return $this->present($appointment->fresh()->load('doctor.user:id,name', 'department:id,name'));
    }

    public function reschedule(Request $request, Appointment $appointment)
    {
        $patient = $this->myPatient($request);
        abort_if($appointment->patient_id !== $patient->id, 403);
        $data = $request->validate(['slot' => ['required', 'date_format:Y-m-d H:i']]);

        if (! $this->booking->patientMayModify($appointment)) {
            return response()->json([
                'message' => "Appointments can only be changed at least {$this->booking->cutoffHours()} hours in advance. Please call the clinic.",
                'code' => 'cutoff_passed',
            ], 422);
        }

        try {
            $this->booking->reschedule($appointment->load('doctor.user'), CarbonImmutable::createFromFormat('Y-m-d H:i', $data['slot']));
        } catch (SlotUnavailableException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'slot_unavailable'], 409);
        }

        $appointment->doctor?->user?->notify(new AppointmentBookedNotification($appointment->id,
            "Appointment rescheduled by {$patient->first_name} {$patient->last_name} to {$appointment->fresh()->appointment_at->format('D, M j H:i')}"));
        Notify::patient($patient, 'appointment_rescheduled',
            'Your appointment was moved to '.$appointment->fresh()->appointment_at->format('D, M j \a\t H:i').'.', '/portal/appointments');
        Audit::log($request, 'appointment_rescheduled', $appointment);

        return $this->present($appointment->fresh()->load('doctor.user:id,name', 'department:id,name'));
    }

    public function ics(Request $request, Appointment $appointment)
    {
        abort_if($appointment->patient_id !== $this->myPatient($request)->id, 403);
        $appointment->load('doctor.user:id,name', 'department:id,name');

        $start = new DateTimeImmutable($appointment->appointment_at->format('Y-m-d H:i:s'));
        $end = $start->modify("+{$appointment->duration_minutes} minutes");
        $online = $appointment->visit_type === 'online';

        $ics = IcsBuilder::event(
            $appointment->id, $start, $end,
            'Appointment with Dr. '.($appointment->doctor?->user?->name ?? ''),
            trim(($appointment->reason ? "Reason: {$appointment->reason}\n" : '').($online && $appointment->meeting_url ? "Video visit: {$appointment->meeting_url}" : '')),
            $online ? 'Online video visit' : config('app.name'),
            $online ? $appointment->meeting_url : null,
        );

        return response($ics, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="appointment-'.$start->format('Ymd-Hi').'.ics"',
        ]);
    }

    /** Shape an appointment for the portal UI (adds cancel rules, invoice link, video link). */
    private function present(Appointment $a): array
    {
        $invoice = \App\Models\Invoice::where('appointment_id', $a->id)->first(['id', 'invoice_number', 'status', 'amount', 'amount_paid']);

        return $a->toArray() + [
            'can_modify' => $this->booking->patientMayModify($a),
            'cutoff_hours' => $this->booking->cutoffHours(),
            'invoice' => $invoice,
            'join_url' => $a->visit_type === 'online' && in_array($a->status, ['scheduled', 'confirmed', 'checked_in'], true) ? $a->meeting_url : null,
        ];
    }
}
