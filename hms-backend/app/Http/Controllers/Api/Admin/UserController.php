<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function roles()
    {
        return Role::orderBy('name')->get(['id', 'name']);
    }

    public function index()
    {
        return User::with('roles:id,name', 'staffProfile.department:id,name')
            ->orderBy('name')
            ->paginate(15);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role' => ['required', Rule::in(Role::pluck('name'))],
            'department_id' => 'nullable|exists:departments,id',
            'specialization' => 'nullable|string|max:100',
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);
            $user->assignRole($data['role']);

            // Clinical roles get a staff profile
            if (in_array($data['role'], ['doctor', 'nurse'])) {
                StaffProfile::create([
                    'user_id' => $user->id,
                    'employee_code' => $this->nextEmployeeCode($data['role']),
                    'department_id' => $data['department_id'] ?? null,
                    'position' => $data['role'],
                    'specialization' => $data['specialization'] ?? null,
                ]);
            }

            return $user;
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'created_user',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'new_values' => ['name' => $user->name, 'email' => $user->email, 'role' => $data['role']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($user->load('roles', 'staffProfile.department'), 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'role' => ['sometimes', 'required', Rule::in(Role::pluck('name'))],
            'is_active' => 'sometimes|boolean',
        ]);

        // --- SECURITY GUARDS ---

        // 1. Cannot deactivate yourself
        if (array_key_exists('is_active', $data) && $user->id === $request->user()->id && ! $data['is_active']) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        // 2. Cannot demote yourself
        if (isset($data['role']) && $user->id === $request->user()->id && $data['role'] !== 'admin') {
            return response()->json(['message' => 'You cannot remove your own admin role.'], 422);
        }

        // 3. Must always keep at least one admin
        if ($user->hasRole('admin') && isset($data['role']) && $data['role'] !== 'admin') {
            $otherAdmins = User::role('admin')->where('id', '!=', $user->id)->count();
            if ($otherAdmins === 0) {
                return response()->json(['message' => 'The system must always keep at least one admin account.'], 422);
            }
        }

        $user->update(collect($data)->only(['name', 'email'])->toArray());

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        if (array_key_exists('is_active', $data)) {
            $user->update(['is_active' => $data['is_active']]);
            // Deactivation instantly revokes ALL sessions/tokens
            if (! $data['is_active']) {
                $user->tokens()->delete();
            }
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'updated_user',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'old_values' => ['is_active' => $user->getOriginal('is_active')],
            'new_values' => collect($data)->except(['password'])->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($user->load('roles', 'staffProfile.department'));
    }

    public function resetPassword(Request $request, User $user)
    {
        $data = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user->update(['password' => Hash::make($data['password'])]);
        $user->tokens()->delete(); // sign them out everywhere

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'reset_user_password',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Password reset. The user has been signed out on all devices.']);
    }

    private function nextEmployeeCode(string $role): string
    {
        $prefix = $role === 'doctor' ? 'DOC' : ($role === 'nurse' ? 'NUR' : 'EMP');
        $count = StaffProfile::where('employee_code', 'like', $prefix . '-%')->count();
        return sprintf('%s-%03d', $prefix, $count + 1);
    }
}