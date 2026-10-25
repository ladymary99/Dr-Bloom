<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consent;
use App\Models\Patient;
use App\Models\Setting;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PortalProfileController extends Controller
{
    private function me(Request $r): Patient
    {
        abort_if(! $r->user()->patient, 403, 'No patient profile linked to this account.');

        return $r->user()->patient;
    }

    public function show(Request $request)
    {
        $patient = $this->me($request);
        Audit::log($request, 'viewed', $patient);

        return response()->json([
            'patient' => $patient,
            'user' => ['email' => $request->user()->email, 'two_factor_enabled' => $request->user()->two_factor_enabled],
            'privacy_policy_version' => Setting::get('privacy_policy_version', '2026-10'),
        ]);
    }

    public function update(Request $request)
    {
        $patient = $this->me($request);
        $data = $request->validate([
            'first_name' => 'sometimes|required|string|max:100',
            'last_name' => 'sometimes|required|string|max:100',
            'phone' => 'sometimes|required|string|max:20',
            'date_of_birth' => 'sometimes|required|date|before:today',
            'gender' => 'sometimes|required|in:male,female,other',
            'address' => 'nullable|string|max:500',
            'blood_type' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'])],
            'allergies' => 'nullable|string|max:2000',
            'chronic_conditions' => 'nullable|string|max:2000',
            'current_medications' => 'nullable|string|max:2000',
            'emergency_contact_name' => 'nullable|string|max:120',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relation' => 'nullable|string|max:60',
            'insurance_provider' => 'nullable|string|max:120',
            'insurance_policy_number' => 'nullable|string|max:60',
            'insurance_group_number' => 'nullable|string|max:60',
            'insurance_expires_on' => 'nullable|date',
            'preferred_language' => ['sometimes', Rule::in(['en', 'az', 'ru'])],
        ]);

        $old = array_intersect_key($patient->getOriginal(), $data);
        $patient->update($data);

        if (isset($data['first_name']) || isset($data['last_name'])) {
            $request->user()->update(['name' => $patient->first_name.' '.$patient->last_name]);
        }

        // never write sensitive values into the audit log, only which fields changed
        Audit::log($request, 'profile_updated', $patient, null, [], ['fields' => array_keys($data)]);

        return response()->json($patient->fresh());
    }

    public function preferences(Request $request)
    {
        $patient = $this->me($request);
        $prefs = $request->validate([
            'email' => 'required|boolean',
            'sms' => 'required|boolean',
            'appointment_reminders' => 'required|boolean',
            'messages' => 'required|boolean',
            'billing' => 'required|boolean',
        ]);
        $patient->update(['notification_prefs' => $prefs]);
        Audit::log($request, 'notification_prefs_updated', $patient);

        return response()->json($patient->fresh()->notification_prefs);
    }

    public function changeEmail(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'current_password' => 'required|current_password',
        ]);

        DB::transaction(function () use ($user, $data) {
            $user->update(['email' => $data['email']]);
            $user->patient?->update(['email' => $data['email']]);
            // other devices must sign in again with the new address
            $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();
        });
        Audit::log($request, 'email_changed', $user, null, [], ['to_domain' => substr(strrchr($data['email'], '@'), 1)]);

        return response()->json(['message' => 'Email updated. Other sessions were signed out.', 'email' => $user->email]);
    }

    public function consents(Request $request)
    {
        return response()->json($this->me($request)->consents()->latest('accepted_at')->get(['type', 'version', 'accepted_at']));
    }

    public function acceptConsent(Request $request)
    {
        $patient = $this->me($request);
        $request->validate(['accept' => 'required|accepted']);
        $version = Setting::get('privacy_policy_version', '2026-10');

        DB::transaction(function () use ($request, $patient, $version) {
            Consent::create([
                'patient_id' => $patient->id, 'user_id' => $request->user()->id,
                'type' => 'privacy_policy', 'version' => $version, 'accepted_at' => now(),
                'ip_address' => $request->ip(), 'user_agent' => substr((string) $request->userAgent(), 0, 500),
            ]);
            $patient->update(['privacy_accepted_at' => now(), 'privacy_policy_version' => $version]);
        });

        return response()->json(['accepted' => true, 'version' => $version]);
    }
}
