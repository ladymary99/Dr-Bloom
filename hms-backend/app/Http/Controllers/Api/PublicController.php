<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Setting;
use App\Models\StaffProfile;

class PublicController extends Controller
{
    public function info()
    {
        return response()->json([
            'hospital_name' => Setting::get('hospital_name', 'Dr-Bloom Hospital'),
            'address'       => Setting::get('address', ''),
            'phone'         => Setting::get('phone', ''),
            'email'         => Setting::get('email', ''),
            'working_hours' => Setting::get('working_hours', ''),
            'doctors'       => StaffProfile::where('position', 'doctor')->where('is_active', true)->count(),
            'departments'   => Department::where('is_active', true)->count(),
        ]);
    }

    public function doctors()
    {
        return StaffProfile::where('position', 'doctor')->where('is_active', true)
            ->with('user:id,name', 'department:id,name')
            ->orderBy('employee_code')
            ->get()
            ->map(fn($d) => [
                'name'           => $d->user->name,
                'specialization' => $d->specialization,
                'department'     => $d->department?->name,
            ]);
    }
}