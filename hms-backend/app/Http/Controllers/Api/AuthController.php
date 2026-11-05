<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\NewPatientNotification;
use Illuminate\Http\Request;
use App\Models\Consent;
use App\Support\NameCase;
use App\Models\Setting;
use App\Support\Security\Totp;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function registerPatient(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'required|string|max:20',
            'date_of_birth' => 'required|date',
            'gender' => 'required|in:male,female,other',
            'password' => 'required|string|min:8|confirmed',
            'accept_privacy' => 'accepted',
            'preferred_language' => 'nullable|in:en,az,ru',
        ]);

        $user = \Illuminate\Support\Facades\DB::transaction(function () use ($data, $request) {
            $user = User::create([
                'name' => NameCase::format($data['first_name']) . ' ' . NameCase::format($data['last_name']),
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);
            $user->assignRole('patient');

            $version = Setting::get('privacy_policy_version', '2026-10');
            $patient = \App\Models\Patient::create([
                'user_id' => $user->id,
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'date_of_birth' => $data['date_of_birth'],
                'gender' => $data['gender'],
                'preferred_language' => $data['preferred_language'] ?? 'en',
                'privacy_accepted_at' => now(),
                'privacy_policy_version' => $version,
            ]);
            // proof of consent: what, which version, when, from where
            Consent::create([
                'patient_id' => $patient->id, 'user_id' => $user->id, 'type' => 'privacy_policy',
                'version' => $version, 'accepted_at' => now(),
                'ip_address' => $request->ip(), 'user_agent' => substr((string) $request->userAgent(), 0, 500),
            ]);

            return $user;
        });

        $token = $user->createToken('api')->plainTextToken;

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'patient_registered',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $user->load('patient');
        Notification::send(
            User::role('admin')->get(),
            new NewPatientNotification($user->name, $user->patient?->mrn ?? '—')
        );

        return response()->json([
            'token' => $token,
            'user' => $user->load('patient'),
            'roles' => $user->getRoleNames(),
            'permissions' => [],
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'code' => 'nullable|string|max:10',
        ]);

        // Per-account lockout on top of the per-IP route throttle: 5 failures => 15 minutes
        $throttleKey = 'login:'.Str::lower($request->email).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            throw ValidationException::withMessages([
                'email' => ['Too many failed attempts. Try again in '.ceil(RateLimiter::availableIn($throttleKey) / 60).' minutes.'],
            ]);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 900);
            AuditLog::create([
                'action' => 'login_failed',
                'auditable_type' => User::class,
                'auditable_id' => $user?->id ?? 'unknown',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        if (! $user->is_active) {
            AuditLog::create([
                'action' => 'login_blocked_deactivated',
                'auditable_type' => User::class,
                'auditable_id' => $user->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated. Contact your administrator.'],
            ]);
        }

        // Optional 2FA: password alone is not enough once the user enabled it
        if ($user->two_factor_confirmed_at) {
            if (! $request->filled('code')) {
                return response()->json(['two_factor_required' => true, 'message' => 'Enter the 6-digit code from your authenticator app.'], 422);
            }
            if (! Totp::verify($user->two_factor_secret, $request->code)) {
                RateLimiter::hit($throttleKey, 900);
                throw ValidationException::withMessages(['code' => ['That code is not valid or has expired.']]);
            }
        }
        RateLimiter::clear($throttleKey);

        // One token per user — old tokens die on new login
        $user->tokens()->delete();
        $token = $user->createToken('api')->plainTextToken;

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'login',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'token' => $token,
            'user' => $user->load('staffProfile.department'),
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }
    public function showAvatar(Request $request)
    {
        $path = $request->user()->avatar_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path));
    }

    public function updateAvatar(Request $request)
    {
        $data = $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $user = $request->user();
        $path = $data['avatar']->store("avatars/{$user->id}", 'local');
        abort_if(! $path, 500, 'Could not store the profile photo.');

        $oldPath = $user->avatar_path;
        $user->avatar_path = $path;
        $user->save();

        if ($user->patient) {
            $oldPatientPhoto = $user->patient->profile_photo_path;
            $user->patient->profile_photo_path = $path;
            $user->patient->save();
            if ($oldPatientPhoto && $oldPatientPhoto !== $oldPath && $oldPatientPhoto !== $path) {
                Storage::disk('local')->delete($oldPatientPhoto);
            }
        }

        if ($oldPath && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        return response()->json(['message' => 'Profile photo updated.']);
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => 'required|current_password',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();
        $user->update(['password' => Hash::make($data['password'])]);

        // Sign out everywhere EXCEPT this device
        $currentToken = $user->currentAccessToken();
        $user->tokens()->where('id', '!=', $currentToken->id)->delete();

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'password_changed',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Password updated. Other sessions were signed out.']);
    }
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('staffProfile.department'),
            'roles' => $request->user()->getRoleNames(),
            'permissions' => $request->user()->getAllPermissions()->pluck('name'),
        ]);
    }

    // PUT /api/me/staff-profile — contact + licence details the staff member maintains themselves
    public function updateStaffProfile(Request $request)
    {
        $profile = $request->user()->staffProfile;
        abort_if(! $profile, 404, 'No staff profile linked to this account.');
        $data = $request->validate([
            'phone' => 'nullable|string|max:30',
            'license_number' => 'nullable|string|max:60',
            'languages' => 'nullable|string|max:200',
        ]);
        $profile->update($data);

        return response()->json($request->user()->fresh()->load('staffProfile.department'));
    }

    // GET /api/me/sessions — signed-in devices (tokens)
    public function sessions(Request $request)
    {
        $current = $request->user()->currentAccessToken()->id;

        return $request->user()->tokens()->latest('last_used_at')->get(['id', 'name', 'created_at', 'last_used_at', 'expires_at'])
            ->map(fn ($t) => ['id' => $t->id, 'created_at' => $t->created_at, 'last_used_at' => $t->last_used_at, 'current' => $t->id === $current]);
    }

    // DELETE /api/me/sessions/{id} — sign a device out
    public function revokeSession(Request $request, int $id)
    {
        $token = $request->user()->tokens()->whereKey($id)->firstOrFail();
        abort_if($token->id === $request->user()->currentAccessToken()->id, 422, 'Use Sign out to end this session.');
        $token->delete();

        return response()->json(['message' => 'Device signed out.']);
    }

    // POST /api/me/verify-password — used by the idle lock screen
    public function verifyPassword(Request $request)
    {
        $request->validate(['password' => 'required|string']);
        $key = 'unlock:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Too many attempts. Please sign out and sign in again.'], 429);
        }
        if (! Hash::check($request->password, $request->user()->password)) {
            RateLimiter::hit($key, 300);

            return response()->json(['message' => 'That password is not correct.'], 422);
        }
        RateLimiter::clear($key);

        return response()->json(['ok' => true]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }
}