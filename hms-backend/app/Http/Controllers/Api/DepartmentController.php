<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;

class DepartmentController extends Controller
{
    public function index()
    {
        return Department::where('is_active', true)
            ->withCount(['staff', 'appointments'])
            ->orderBy('name')
            ->get();
    }
    public function show(\App\Models\Department $department)
{
    return response()->json([
        'department' => $department,
        'staff' => $department->staff()->with('user:id,name,email')->orderBy('position')->get(),
        'stats' => [
            'staff_count'      => $department->staff()->count(),
            'appointments'     => $department->appointments()->count(),
            'revenue'          => (float) $department->invoices()->where('status', 'paid')->sum('amount'),
            'pending'          => (float) $department->invoices()->where('status', 'pending')->sum('amount'),
            'invoices_count'   => $department->invoices()->count(),
        ],
        'recent_invoices' => $department->invoices()
            ->with('patient:id,mrn,first_name,last_name')
            ->latest()->limit(10)->get(),
    ]);
}
}