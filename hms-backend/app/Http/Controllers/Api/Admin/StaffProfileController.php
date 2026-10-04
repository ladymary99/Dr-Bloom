<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\StaffProfile;
use Illuminate\Http\Request;

class StaffProfileController extends Controller
{
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