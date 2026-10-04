<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        return Department::query()
            ->when(! $request->boolean('include_inactive'), fn ($query) => $query->where('is_active', true))
            ->withCount(['staff', 'appointments'])
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:departments,name',
            'code' => 'required|string|max:10|unique:departments,code',
            'description' => 'nullable|string',
        ]);

        return response()->json(Department::create([...$data, 'is_active' => true]), 201);
    }

    public function update(Request $request, Department $department)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:100|unique:departments,name,' . $department->id,
            'code' => 'sometimes|required|string|max:10|unique:departments,code,' . $department->id,
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $department->update($data);

        return $department->fresh();
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