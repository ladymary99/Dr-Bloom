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
    private function profile(Request $request): StaffProfile
    {
        $user = $request->user();
        if ($user->hasRole('admin') && $request->query('doctor_id')) {
            return StaffProfile::where('position', 'doctor')->findOrFail($request->query('doctor_id'));
        }
        abort_if(! $user->staffProfile || $user->staffProfile->position !== 'doctor', 403, 'Only doctors have a schedule.');

        return $user->staffProfile;
    }

    public function show(Request $request)
    {
        $p = $this->profile($request);

        return response()->json([
            'doctor_id' => $p->id,
            'working_days' => $p->working_days ?? [1, 2, 3, 4, 5],
            'working_hours' => $p->working_hours ?: BookingService::DEFAULT_HOURS,
            'slot_minutes' => (int) ($p->slot_minutes ?: 30),
            'bio' => $p->bio,
            'languages' => $p->languages,
            'years_experience' => $p->years_experience,
            'consultation_fee' => $p->consultation_fee,
            'time_off' => $p->timeOff()->where('ends_on', '>=', now()->toDateString())->orderBy('starts_on')->get(),
        ]);
    }

    public function update(Request $request)
    {
        $p = $this->profile($request);
        $data = $request->validate([
            'working_days' => 'required|array|min:1',
            'working_days.*' => 'integer|between:1,7|distinct',
            'working_hours.start' => 'required|date_format:H:i',
            'working_hours.end' => 'required|date_format:H:i|after:working_hours.start',
            'working_hours.break_start' => 'nullable|date_format:H:i',
            'working_hours.break_end' => 'nullable|date_format:H:i|after:working_hours.break_start',
            'slot_minutes' => 'required|integer|in:10,15,20,30,45,60',
            'bio' => 'nullable|string|max:1500',
            'languages' => 'nullable|string|max:200',
            'years_experience' => 'nullable|integer|min:0|max:70',
            'consultation_fee' => 'nullable|numeric|min:0|max:999999',
        ]);

        $h = $data['working_hours'];
        if (! empty($h['break_start']) xor ! empty($h['break_end'])) {
            throw ValidationException::withMessages(['working_hours.break_start' => ['Set both break start and end, or neither.']]);
        }
        if (! empty($h['break_start']) && ($h['break_start'] < $h['start'] || $h['break_end'] > $h['end'])) {
            throw ValidationException::withMessages(['working_hours.break_start' => ['The break must fall inside working hours.']]);
        }
        $data['working_days'] = array_values(array_map('intval', $data['working_days']));
        sort($data['working_days']);

        $p->update($data);
        Audit::log($request, 'availability_updated', $p);

        // existing bookings are never deleted by a schedule change, but tell the doctor which ones no longer fit
        $conflicts = Appointment::where('doctor_id', $p->id)->whereIn('status', Appointment::ACTIVE)
            ->where('appointment_at', '>=', now())->get()
            ->filter(function ($a) use ($data) {
                $t = $a->appointment_at;
                $end = $t->copy()->addMinutes($a->duration_minutes)->format('H:i');

                return ! in_array((int) $t->format('N'), $data['working_days'], true)
                    || $t->format('H:i') < $data['working_hours']['start'] || $end > $data['working_hours']['end'];
            })->count();

        return response()->json($this->show($request)->getData(true) + ['outside_hours_appointments' => $conflicts]);
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
