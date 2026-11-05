<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\DoctorTimeOff;
use App\Models\StaffProfile;
use App\Services\BookingService;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** A doctor manages their own schedule (admins may manage any doctor with ?doctor_id=). */
class DoctorAvailabilityController extends Controller
{
    public function __construct(private BookingService $booking) {}

    private function profile(Request $request): StaffProfile
    {
        $user = $request->user();
        if ($user->hasRole('admin') && $request->query('doctor_id')) {
            return StaffProfile::where('position', 'doctor')->findOrFail($request->query('doctor_id'));
        }
        abort_if(! $user->staffProfile || $user->staffProfile->position !== 'doctor', 403, 'Only doctors have a schedule.');

        return $user->staffProfile;
    }

    /** The schedule as per-weekday blocks, whichever shape is stored (legacy rows are converted). */
    private function weekly(StaffProfile $p): array
    {
        if ($p->weekly_schedule) {
            return $p->weekly_schedule;
        }
        $h = $p->working_hours ?: BookingService::DEFAULT_HOURS;
        $breaks = (! empty($h['break_start']) && ! empty($h['break_end'])) ? [[$h['break_start'], $h['break_end']]] : [];
        $out = [];
        foreach (($p->working_days ?? [1, 2, 3, 4, 5]) as $d) {
            $out[(string) $d] = ['start' => $h['start'], 'end' => $h['end'], 'breaks' => $breaks];
        }

        return $out;
    }

    public function show(Request $request)
    {
        $p = $this->profile($request);

        return response()->json([
            'doctor_id' => $p->id,
            'weekly_schedule' => $this->weekly($p),
            'slot_minutes' => (int) ($p->slot_minutes ?: 30),
            'buffer_minutes' => (int) $p->buffer_minutes,
            'max_per_day' => $p->max_per_day,
            'accepts_online' => (bool) $p->accepts_online,
            'accepts_in_person' => (bool) $p->accepts_in_person,
            'bio' => $p->bio,
            'languages' => $p->languages,
            'years_experience' => $p->years_experience,
            'consultation_fee' => $p->consultation_fee,
            'license_number' => $p->license_number,
            'time_off' => $p->timeOff()->where('ends_on', '>=', now()->toDateString())->orderBy('starts_on')->get(),
        ]);
    }

    /** Validate + normalise the weekly block; throws a field-level error the UI can show. */
    private function cleanWeekly(array $weekly): array
    {
        $out = [];
        foreach ($weekly as $day => $cfg) {
            if (! preg_match('/^[1-7]$/', (string) $day) || empty($cfg)) {
                continue;   // a day without a block is a day off
            }
            $field = "weekly_schedule.$day";
            foreach (['start', 'end'] as $k) {
                if (! preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', (string) ($cfg[$k] ?? ''))) {
                    throw ValidationException::withMessages([$field => ['Enter start and end times as HH:MM.']]);
                }
            }
            if ($cfg['end'] <= $cfg['start']) {
                throw ValidationException::withMessages([$field => ['End time must be after start time.']]);
            }
            $breaks = [];
            foreach (array_slice($cfg['breaks'] ?? [], 0, 4) as $b) {
                if (! isset($b[0], $b[1]) || ! preg_match('/^\d{2}:\d{2}$/', $b[0]) || ! preg_match('/^\d{2}:\d{2}$/', $b[1])) {
                    throw ValidationException::withMessages([$field => ['Breaks need a start and an end time.']]);
                }
                if ($b[1] <= $b[0] || $b[0] < $cfg['start'] || $b[1] > $cfg['end']) {
                    throw ValidationException::withMessages([$field => ['Each break must be inside working hours and end after it starts.']]);
                }
                $breaks[] = [$b[0], $b[1]];
            }
            usort($breaks, fn ($a, $b) => strcmp($a[0], $b[0]));
            for ($i = 1; $i < count($breaks); $i++) {
                if ($breaks[$i][0] < $breaks[$i - 1][1]) {
                    throw ValidationException::withMessages([$field => ['Breaks must not overlap.']]);
                }
            }
            $out[(string) $day] = ['start' => $cfg['start'], 'end' => $cfg['end'], 'breaks' => $breaks];
        }
        if (! $out) {
            throw ValidationException::withMessages(['weekly_schedule' => ['Choose at least one working day.']]);
        }
        ksort($out);

        return $out;
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'weekly_schedule' => 'required|array',
            'slot_minutes' => 'required|integer|in:10,15,20,30,45,60',
            'buffer_minutes' => 'nullable|integer|min:0|max:60',
            'max_per_day' => 'nullable|integer|min:1|max:100',
            'accepts_online' => 'required|boolean',
            'accepts_in_person' => 'required|boolean',
            'bio' => 'nullable|string|max:1500',
            'languages' => 'nullable|string|max:200',
            'years_experience' => 'nullable|integer|min:0|max:70',
            'consultation_fee' => 'nullable|numeric|min:0|max:999999',
            'license_number' => 'nullable|string|max:60',
        ]);
        if (! $data['accepts_online'] && ! $data['accepts_in_person']) {
            throw ValidationException::withMessages(['accepts_in_person' => ['Offer at least one of in-person or video visits.']]);
        }
        $data['weekly_schedule'] = $this->cleanWeekly($data['weekly_schedule']);
        $data['buffer_minutes'] = (int) ($data['buffer_minutes'] ?? 0);

        // keep the legacy columns in step so older readers still work
        $first = reset($data['weekly_schedule']);
        $data['working_days'] = array_map('intval', array_keys($data['weekly_schedule']));
        $data['working_hours'] = ['start' => $first['start'], 'end' => $first['end']] + (isset($first['breaks'][0]) ? ['break_start' => $first['breaks'][0][0], 'break_end' => $first['breaks'][0][1]] : []);

        return $data;
    }

    public function update(Request $request)
    {
        $p = $this->profile($request);
        $data = $this->validated($request);
        $p->update($data);
        Audit::log($request, 'availability_updated', $p);

        // existing bookings are never deleted by a schedule change; tell the doctor exactly which ones no longer fit
        $conflicts = $this->conflicts($p, $data['weekly_schedule']);

        return response()->json($this->show($request)->getData(true) + ['conflicts' => $conflicts, 'outside_hours_appointments' => count($conflicts)]);
    }

    /** POST /doctor/availability/preview — the slots patients WOULD see with these (unsaved) settings. */
    public function preview(Request $request)
    {
        $p = $this->profile($request);
        $data = $this->validated($request);
        $copy = $p->replicate();
        $copy->id = $p->id;                       // busy slots are looked up by id
        $copy->setRelation('timeOff', $p->timeOff);
        $copy->fill($data);

        return response()->json([
            'days' => $this->booking->availability($copy, now()->toDateString(), now()->addDays(13)->toDateString()),
            'conflicts' => $this->conflicts($p, $data['weekly_schedule']),
        ]);
    }

    /** GET /doctor/slots — my own bookable slots (used to book follow-ups). */
    public function mySlots(Request $request)
    {
        $p = $this->profile($request);
        $data = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d']);

        return response()->json(['slot_minutes' => (int) ($p->slot_minutes ?: 30), 'days' => $this->booking->availability($p, $data['from'] ?? null, $data['to'] ?? null)]);
    }

    /** @return list<array{id:string,appointment_at:string,reason:string}> future bookings that fall outside the given schedule */
    private function conflicts(StaffProfile $p, array $weekly): array
    {
        return Appointment::with('patient:id,first_name,last_name')->where('doctor_id', $p->id)->whereIn('status', Appointment::ACTIVE)
            ->where('appointment_at', '>=', now())->orderBy('appointment_at')->get()
            ->filter(function ($a) use ($weekly) {
                $cfg = $weekly[(string) $a->appointment_at->format('N')] ?? null;
                if (! $cfg) {
                    return true;
                }
                $start = $a->appointment_at->format('H:i');
                $end = $a->appointment_at->copy()->addMinutes($a->duration_minutes)->format('H:i');
                if ($start < $cfg['start'] || $end > $cfg['end']) {
                    return true;
                }
                foreach ($cfg['breaks'] as [$b0, $b1]) {
                    if ($start < $b1 && $end > $b0) {
                        return true;
                    }
                }

                return false;
            })->take(50)->map(fn ($a) => [
                'id' => $a->id, 'appointment_at' => $a->appointment_at->format('Y-m-d\TH:i:s'),
                'patient' => $a->patient ? $a->patient->first_name.' '.$a->patient->last_name : '—', 'reason' => (string) $a->reason,
            ])->values()->all();
    }

    public function addTimeOff(Request $request)
    {
        $p = $this->profile($request);
        $data = $request->validate([
            'starts_on' => 'required|date_format:Y-m-d|after_or_equal:today',
            'ends_on' => 'required|date_format:Y-m-d|after_or_equal:starts_on',
            'reason' => 'nullable|string|max:160',
        ]);

        $off = DoctorTimeOff::create($data + ['staff_profile_id' => $p->id]);
        $affected = Appointment::where('doctor_id', $p->id)->whereIn('status', Appointment::ACTIVE)
            ->whereBetween('appointment_at', [$data['starts_on'].' 00:00:00', $data['ends_on'].' 23:59:59'])->count();
        Audit::log($request, 'time_off_added', $p, null, [], $data);

        return response()->json(['time_off' => $off, 'affected_appointments' => $affected], 201);
    }

    public function removeTimeOff(Request $request, DoctorTimeOff $timeOff)
    {
        abort_if($timeOff->staff_profile_id !== $this->profile($request)->id, 404);
        $timeOff->delete();

        return response()->json(['message' => 'Day off removed.']);
    }
}
