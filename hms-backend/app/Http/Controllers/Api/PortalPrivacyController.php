<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataRequest;
use App\Models\Patient;
use App\Models\PatientDocument;
use App\Support\Audit;
use App\Support\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/** GDPR-style rights: access/portability (instant export) and erasure (admin-reviewed). */
class PortalPrivacyController extends Controller
{
    private function me(Request $r): Patient
    {
        abort_if(! $r->user()->patient, 403);

        return $r->user()->patient;
    }

    public function requests(Request $request)
    {
        return DataRequest::where('patient_id', $this->me($request)->id)->latest()->get(['id', 'type', 'status', 'reason', 'created_at', 'resolved_at']);
    }

    public function createRequest(Request $request)
    {
        $patient = $this->me($request);
        $data = $request->validate(['type' => 'required|in:export,delete', 'reason' => 'nullable|string|max:1000']);

        if (DataRequest::where('patient_id', $patient->id)->where('type', $data['type'])->whereIn('status', ['pending', 'processing'])->exists()) {
            return response()->json(['message' => 'You already have an open request of this type.'], 422);
        }
        $req = DataRequest::create($data + ['patient_id' => $patient->id, 'user_id' => $request->user()->id]);
        Audit::log($request, 'data_request_created', $req, null, [], ['type' => $data['type']]);

        foreach (\App\Models\User::role('admin')->get() as $admin) {
            Notify::user($admin, 'data_request', "{$patient->first_name} {$patient->last_name} requested a data {$data['type']}.", '/admin/privacy-requests');
        }

        return response()->json($req, 201);
    }

    /** Machine-readable copy of everything the portal holds about the patient. */
    public function export(Request $request)
    {
        $patient = $this->me($request);
        Audit::log($request, 'data_exported', $patient);

        $payload = [
            'generated_at' => now()->toIso8601String(),
            'profile' => $patient->only(['mrn', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email', 'address', 'blood_type',
                'allergies', 'chronic_conditions', 'current_medications', 'emergency_contact_name', 'emergency_contact_phone',
                'emergency_contact_relation', 'insurance_provider', 'insurance_policy_number', 'insurance_group_number',
                'insurance_expires_on', 'preferred_language']),
            'appointments' => $patient->appointments()->with('doctor.user:id,name')->get()->map(fn ($a) => [
                'at' => $a->appointment_at, 'doctor' => $a->doctor?->user?->name, 'status' => $a->status, 'reason' => $a->reason, 'type' => $a->visit_type]),
            'visits' => $patient->visits()->with('doctor.user:id,name', 'prescription.items')->get()->map(fn ($v) => $v->forPatient()),
            'lab_results' => $patient->labTests()->whereNotNull('released_at')->get(['test_name', 'category', 'status', 'result', 'released_at']),
            'vaccinations' => $patient->vaccinations()->get(['vaccine_name', 'dose_number', 'administered_on', 'next_due_on']),
            'invoices' => $patient->invoices()->with('items', 'payments:id,invoice_id,amount,method,status,paid_at,receipt_number')->get(),
            'documents' => $patient->documents()->get(['title', 'original_name', 'category', 'created_at']),
            'messages' => $patient->messageThreads()->with('messages:id,thread_id,body,created_at')->get(),
            'consents' => $patient->consents()->get(['type', 'version', 'accepted_at']),
        ];

        return response()->json($payload, 200, [
            'Content-Disposition' => 'attachment; filename="my-health-data-'.now()->format('Ymd').'.json"',
        ]);
    }

    // ───────────────────────── admin side ─────────────────────────

    public function adminIndex(Request $request)
    {
        return DataRequest::with('patient:id,mrn,first_name,last_name,email')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate(20);
    }

    public function adminUpdate(Request $request, DataRequest $dataRequest)
    {
        $data = $request->validate([
            'status' => 'required|in:processing,completed,rejected',
            'admin_notes' => 'nullable|string|max:2000',
            'confirm_erasure' => 'nullable|boolean',
        ]);
        abort_if(in_array($dataRequest->status, ['completed', 'rejected'], true), 422, 'This request is already closed.');

        DB::transaction(function () use ($data, $dataRequest, $request) {
            if ($dataRequest->type === 'delete' && $data['status'] === 'completed') {
                abort_unless($data['confirm_erasure'] ?? false, 422, 'Confirm the erasure explicitly. This cannot be undone.');
                $this->anonymize($dataRequest->patient);
            }
            $dataRequest->update([
                'status' => $data['status'], 'admin_notes' => $data['admin_notes'] ?? null,
                'resolved_by' => in_array($data['status'], ['completed', 'rejected'], true) ? $request->user()->id : null,
                'resolved_at' => in_array($data['status'], ['completed', 'rejected'], true) ? now() : null,
            ]);
        });
        Audit::log($request, 'data_request_'.$data['status'], $dataRequest, null, [], ['type' => $dataRequest->type]);

        return $dataRequest->fresh()->load('patient:id,mrn,first_name,last_name,email');
    }

    /**
     * Erasure: scrub every direct identifier and uploaded file, lock the account, but keep
     * clinical + financial rows under a pseudonymous MRN (legal retention duties).
     */
    private function anonymize(Patient $patient): void
    {
        foreach (PatientDocument::where('patient_id', $patient->id)->get() as $doc) {
            Storage::disk('local')->delete($doc->file_path);
            $doc->delete();
        }
        if ($patient->profile_photo_path) {
            Storage::disk('local')->delete($patient->profile_photo_path);
        }
        foreach ($patient->labTests()->whereNotNull('result_file_path')->get() as $t) {
            Storage::disk('local')->delete($t->result_file_path);
            $t->update(['result_file_path' => null, 'result_file_name' => null, 'result_file_size' => null]);
        }
        $patient->messageThreads()->delete();

        $patient->forceFill([
            'first_name' => 'Deleted', 'last_name' => 'Patient', 'phone' => null, 'email' => null, 'address' => null,
            'national_id' => null, 'profile_photo_path' => null, 'allergies' => null, 'chronic_conditions' => null,
            'current_medications' => null, 'emergency_contact_name' => null, 'emergency_contact_phone' => null,
            'emergency_contact_relation' => null, 'insurance_provider' => null, 'insurance_policy_number' => null,
            'insurance_group_number' => null, 'insurance_expires_on' => null,
        ])->save();

        if ($user = $patient->user) {
            $user->tokens()->delete();
            $user->forceFill([
                'name' => 'Deleted Patient', 'email' => 'deleted-'.$user->id.'@deleted.invalid',
                'password' => bin2hex(random_bytes(24)), 'is_active' => false, 'avatar_path' => null,
                'two_factor_secret' => null, 'two_factor_confirmed_at' => null,
            ])->save();
            $user->notifications()->delete();
        }
    }
}
