<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\StaffProfile;
use Illuminate\Http\Request;

class StaffProfileController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        return StaffProfile::query()
            ->with(['user:id,name,email', 'department:id,name'])
            ->whereIn('position', ['doctor', 'nurse'])
            ->where('is_active', true)
            ->whereHas('user', fn ($query) => $query->where('is_active', true))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($staff) use ($search) {
                    $staff->where('employee_code', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($user) => $user
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->orderBy('position')
            ->orderBy('employee_code')
            ->limit(100)
            ->get(['id', 'user_id', 'employee_code', 'department_id', 'position', 'specialization']);
    }

    // Reassign department / change position / deactivate
    public function update(Request $request, StaffProfile $staff)
    {
        $data = $request->validate([
            'department_id' => 'nullable|exists:departments,id',
            'position' => 'sometimes|string|max:50',
            'specialization' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
        ]);

        $staff->update($data);

        return response()->json($staff->fresh()->load('user:id,name,email', 'department:id,name'));
    }

    // Remove staff member from a department (user account stays)
    public function destroy(StaffProfile $staff)
    {
        $staff->delete();

        return response()->json(['message' => 'Staff removed from department.']);
    }
}