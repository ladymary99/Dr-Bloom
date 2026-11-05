<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessGrant;
use App\Models\Patient;
use App\Models\User;
use App\Services\PatientAccess;
use App\Support\Audit;
use App\Support\Notify;
use Illuminate\Http\Request;

/** Patient lookup + "break the glass" + the administrator's review queue. */
class PatientAccessController extends Controller
{
    // GET /api/patient-lookup?q=…  — minimal identity only (no clinical data), so a doctor can find a patient
    public function lookup(Request $request)
    {
        $q = trim((string) $request->validate(['q' => 'required|string|min:3|max:60'])['q']);

        $hits = Patient::query()
            ->where(fn ($w) => $w->where('first_name', 'ilike', "%{$q}%")->orWhere('last_name', 'ilike', "%{$q}%")->orWhere('mrn', 'ilike', "%{$q}%"))
            ->orderBy('last_name')->limit(10)
            ->get(['id', 'mrn', 'first_name', 'last_name', 'date_of_birth']);

        Audit::log($request, 'patient_lookup', Patient::class, null, [], ['term_length' => mb_strlen($q), 'results' => $hits->count()]);

        return $hits->map(fn ($p) => [
            'id' => $p->id, 'mrn' => $p->mrn, 'first_name' => $p->first_name, 'last_name' => $p->last_name,
            'date_of_birth' => $p->date_of_birth?->toDateString(),
            'has_access' => PatientAccess::can($request->user(), $p),
        ]);
    }

    // POST /api/patients/{patient}/break-glass  {reason}
    public function breakGlass(Request $request, Patient $patient)
    {
        $user = $request->user();
        abort_unless(PatientAccess::restricted($user), 422, 'Your role does not need emergency access.');
        $data = $request->validate(['reason' => 'required|string|min:15|max:500']);

        if (PatientAccess::relationship($user, $patient->id)) {
            return response()->json(['message' => 'You already have a care relationship with this patient.'], 422);
        }
        if ($existing = PatientAccess::activeGrant($user, $patient->id)) {
            return response()->json($existing);
        }

        $grant = AccessGrant::create([
            'user_id' => $user->id, 'patient_id' => $patient->id, 'reason' => trim($data['reason']),
            'expires_at' => now()->addHours(PatientAccess::GLASS_HOURS),
        ]);
        Audit::log($request, 'break_glass', $patient, null, [], ['reason' => $grant->reason, 'expires_at' => $grant->expires_at->toIso8601String()]);

        foreach (User::role('admin')->get() as $admin) {
            Notify::user($admin, 'break_glass', "{$user->name} opened {$patient->first_name} {$patient->last_name}'s record by break-the-glass.", '/admin/break-glass');
        }

        return response()->json($grant, 201);
    }

    // GET /api/admin/access-grants?status=unreviewed|all
    public function index(Request $request)
    {
        return AccessGrant::with('user:id,name', 'patient:id,mrn,first_name,last_name')
            ->when($request->query('status', 'unreviewed') === 'unreviewed', fn ($q) => $q->whereNull('reviewed_at'))
            ->latest()->paginate(20);
    }

    // PUT /api/admin/access-grants/{grant}/review
    public function review(Request $request, AccessGrant $grant)
    {
        $data = $request->validate(['outcome' => 'required|in:appropriate,inappropriate', 'note' => 'nullable|string|max:1000']);
        abort_if($grant->reviewed_at, 422, 'Already reviewed.');

        $grant->update(['reviewed_at' => now(), 'reviewed_by' => $request->user()->id, 'review_outcome' => $data['outcome'], 'review_note' => $data['note'] ?? null]);
        Audit::log($request, 'break_glass_reviewed', $grant, null, [], ['outcome' => $data['outcome']]);

        return $grant->fresh()->load('user:id,name', 'patient:id,mrn,first_name,last_name');
    }
}
