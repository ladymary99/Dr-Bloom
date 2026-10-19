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

        return response()->json([
            'department' => $department,
            'team' => StaffProfile::with('user:id,name,email')
                ->where('department_id', $department->id)
                ->where('is_active', true)
                ->orderBy('position')
                ->orderBy('employee_code')
                ->get(['id', 'user_id', 'employee_code', 'position', 'specialization', 'department_id']),
            'stats' => [
                'staff' => StaffProfile::where('department_id', $department->id)->where('is_active', true)->count(),
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
