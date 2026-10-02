<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StaffProfile;

class LookupController extends Controller
{
    // Active doctors for dropdowns (booking forms)
    public function doctors()
    {
        return StaffProfile::where('position', 'doctor')
            ->where('is_active', true)
            ->with('user:id,name', 'department:id,name')
            ->orderBy('employee_code')
            ->get(['id', 'user_id', 'department_id', 'specialization']);
    }
}