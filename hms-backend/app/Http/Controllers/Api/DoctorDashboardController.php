<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\StaffProfile;
use App\Models\Visit;

class DoctorDashboardController extends Controller
{
    public function dashboard()
    {
        $profile = $this->profile();

        $appointments = $profile->appointments();
        $patients = Patient::query()
            ->where(fn ($query) => $query
                ->whereHas('appointments', fn ($appointments) => $appointments->where('doctor_id', $profile->id))
                ->orWhereHas('visits', fn ($visits) => $visits->where('doctor_id', $profile->id))
                ->orWhereHas('admissions', fn ($admissions) => $admissions->where('doctor_id', $profile->id)));

        return response()->json([
            'doctor' => $profile->load('user:id,name,email', 'department:id,name,code'),
            'stats' => [
                'appointments_today' => (clone $appointments)
                    ->whereDate('appointment_at', today())
                    ->whereNotIn('status', ['cancelled', 'no_show'])
                    ->count(),
                'upcoming_appointments' => (clone $appointments)
                    ->where('appointment_at', '>=', now())
                    ->whereIn('status', ['scheduled', 'confirmed'])
                    ->count(),
                'patients' => $patients->count(),
                'visits_this_month' => $profile->visits()
                    ->whereBetween('visited_at', [now()->startOfMonth(), now()])
                    ->count(),
                'current_admissions' => Admission::where('doctor_id', $profile->id)
                    ->where('status', 'admitted')
                    ->count(),
            ],
            'upcoming' => (clone $appointments)
                ->with('patient:id,mrn,first_name,last_name', 'department:id,name')
                ->where('appointment_at', '>=', now())
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->orderBy('appointment_at')
                ->limit(8)
                ->get(),
        ]);
    }

    public function department()
    {
        $profile = $this->profile();
        $department = $profile->department;

        if (! $department) {
            return response()->json([
                'department' => null,
                'team' => [],
                'stats' => ['staff' => 0, 'appointments' => 0],
            ]);
        }

        $booking = app(\App\Services\BookingService::class);
        $today = now()->toDateString();
        $iso = (string) now()->format('N');

        $team = StaffProfile::with('user:id,name,email', 'timeOff')
            ->where('department_id', $department->id)
            ->where('is_active', true)
            ->orderBy('position')
            ->orderBy('employee_code')
            ->get(['id', 'user_id', 'employee_code', 'position', 'specialization', 'department_id', 'phone', 'working_days', 'working_hours', 'weekly_schedule', 'slot_minutes', 'buffer_minutes', 'max_per_day'])
            ->map(function (StaffProfile $m) use ($booking, $today, $iso) {
                $row = $m->only(['id', 'employee_code', 'position', 'specialization', 'phone']) + ['user' => $m->user];
                if ($m->position !== 'doctor') {
                    return $row;
                }
                $cfg = $m->weekly_schedule ? ($m->weekly_schedule[$iso] ?? null)
                    : (in_array((int) $iso, $m->working_days ?? [1, 2, 3, 4, 5], true) ? ($m->working_hours ?: \App\Services\BookingService::DEFAULT_HOURS) : null);
                $onLeave = $m->timeOff->contains(fn ($t) => $t->starts_on->toDateString() <= $today && $t->ends_on->toDateString() >= $today);
                $next = collect($booking->availability($m))->map(fn ($times, $d) => "$d {$times[0]}")->first();

                return $row + [
                    'today' => ['status' => $onLeave ? 'leave' : ($cfg ? 'working' : 'off'), 'hours' => $cfg ? "{$cfg['start']}–{$cfg['end']}" : null],
                    'patients_today' => Appointment::where('doctor_id', $m->id)->whereDate('appointment_at', $today)->whereIn('status', Appointment::ACTIVE)->count(),
                    'next_available' => $next,
                ];
            });

        return response()->json([
            'department' => $department,
            'team' => $team,
            'stats' => [
                'staff' => StaffProfile::where('department_id', $department->id)->where('is_active', true)->count(),
                // same definition as every appointment list: appointments of this department's doctors
                'appointments' => Appointment::where('department_id', $department->id)->count(),
            ],
        ]);
    }

    private function profile(): StaffProfile
    {
        abort_unless(auth()->user()->hasRole('doctor'), 403);

        $profile = auth()->user()->staffProfile;
        abort_if(! $profile, 403, 'No staff profile linked to this doctor account.');

        return $profile;
    }
}
