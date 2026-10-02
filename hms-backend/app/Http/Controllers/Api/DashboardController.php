<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\Patient;
use App\Models\StaffProfile;
use App\Models\Visit;

class DashboardController extends Controller
{
    public function stats()
    {
        return response()->json([
            'patients_total'      => Patient::count(),
            'patients_today'      => Patient::whereDate('created_at', today())->count(),
            'appointments_today'  => Appointment::whereDate('appointment_at', today())
                                        ->where('status', '!=', 'cancelled')->count(),
            'appointments_upcoming' => Appointment::where('appointment_at', '>=', now())
                                        ->whereIn('status', ['scheduled', 'confirmed'])->count(),
            'visits_today'        => Visit::whereDate('visited_at', today())->count(),
            'doctors_on_duty'     => StaffProfile::where('position', 'doctor')->where('is_active', true)->count(),
            'departments'         => Department::where('is_active', true)->count(),
        ]);
    }
}