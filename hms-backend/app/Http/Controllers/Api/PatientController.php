<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\User;
use App\Services\PatientAccess;
use App\Notifications\NewPatientNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class PatientController extends Controller
{
    // GET /api/patients?search=&sort=name|last_visit|next_appointment|created&dir=asc|desc&gender=&blood_type=&age_min=&age_max=&admitted=1
    public function index(Request $request)
    {
        $user = $request->user();
        $filters = $request->validate([
            'search' => 'nullable|string|max:80', 'sort' => 'nullable|in:name,last_visit,next_appointment,created', 'dir' => 'nullable|in:asc,desc',
            'gender' => 'nullable|in:male,female,other', 'blood_type' => 'nullable|string|max:8', 'condition' => 'nullable|string|max:80',
            'age_min' => 'nullable|integer|min:0|max:130', 'age_max' => 'nullable|integer|min:0|max:130', 'admitted' => 'nullable|boolean',
        ]);

        $query = Patient::query()->select('patients.*');
        PatientAccess::scope($query, $user);   // doctors: care relationship or live break-the-glass only

        if ($this->isNurse($request)) {
            $query->where(function ($q) {
                $q->whereHas('appointments')->orWhereHas('visits')->orWhereHas('admissions');
            });
        }

        // list columns: last visit, next appointment, primary doctor, admitted flag
        $mineOnly = PatientAccess::restricted($user) ? $user->staffProfile?->id : null;
        $query->selectSub(\App\Models\Visit::select('visited_at')->whereColumn('patient_id', 'patients.id')->where('status', 'signed')->orderByDesc('visited_at')->limit(1), 'last_visit_at')
            ->selectSub(\App\Models\Appointment::select('appointment_at')->whereColumn('patient_id', 'patients.id')
                ->whereIn('status', \App\Models\Appointment::ACTIVE)->where('appointment_at', '>=', now())
                ->when($mineOnly, fn ($q, $id) => $q->where('doctor_id', $id))->orderBy('appointment_at')->limit(1), 'next_appointment_at')
            ->selectRaw("coalesce(
                (select u.name from visits v join staff_profiles sp on sp.id = v.doctor_id join users u on u.id = sp.user_id where v.patient_id = patients.id order by v.visited_at desc limit 1),
                (select u.name from appointments a join staff_profiles sp on sp.id = a.doctor_id join users u on u.id = sp.user_id where a.patient_id = patients.id order by a.appointment_at desc limit 1)
            ) as primary_doctor")
            ->selectRaw("exists(select 1 from admissions ad where ad.patient_id = patients.id and ad.status = 'admitted') as is_admitted");

        $query
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($qq) use ($search) {
                    $qq->where('first_name', 'ilike', "%{$search}%")
                        ->orWhere('last_name', 'ilike', "%{$search}%")
                        ->orWhere('mrn', 'ilike', "%{$search}%")
                        ->orWhereRaw("(first_name || ' ' || last_name) ilike ?", ["%{$search}%"]);
                });
            })
            ->when($filters['gender'] ?? null, fn ($q, $v) => $q->where('gender', $v))
            ->when($filters['blood_type'] ?? null, fn ($q, $v) => $q->where('blood_type', $v))
            ->when($filters['condition'] ?? null, fn ($q, $v) => $q->where('chronic_conditions', 'ilike', "%{$v}%"))
            ->when(isset($filters['age_min']), fn ($q) => $q->where('date_of_birth', '<=', now()->subYears((int) $filters['age_min'])->endOfDay()))
            ->when(isset($filters['age_max']), fn ($q) => $q->where('date_of_birth', '>=', now()->subYears((int) $filters['age_max'] + 1)->addDay()->startOfDay()))
            ->when(! empty($filters['admitted']), fn ($q) => $q->whereRaw("exists(select 1 from admissions ad where ad.patient_id = patients.id and ad.status = 'admitted')"));

        $dir = ($filters['dir'] ?? 'asc') === 'desc' ? 'desc' : 'asc';
        match ($filters['sort'] ?? 'created') {
            'name' => $query->orderBy('last_name', $dir)->orderBy('first_name', $dir),
            'last_visit' => $query->orderByRaw("last_visit_at $dir nulls last"),
            'next_appointment' => $query->orderByRaw("next_appointment_at $dir nulls last"),
            default => $query->orderBy('patients.created_at', ($filters['sort'] ?? null) ? $dir : 'desc'),
        };

        return response()->json($query->paginate(15)->withQueryString());
    }

    public function store(StorePatientRequest $request)
    {
        // same name + date of birth is almost always the same person: make staff look before creating a second chart
        if (! $request->boolean('confirm_duplicate')) {
            $dupes = Patient::whereRaw('lower(first_name) = ?', [mb_strtolower(trim($request->first_name))])
                ->whereRaw('lower(last_name) = ?', [mb_strtolower(trim($request->last_name))])
                ->whereDate('date_of_birth', $request->date_of_birth)->limit(5)
                ->get(['id', 'mrn', 'first_name', 'last_name', 'date_of_birth']);
            if ($dupes->isNotEmpty()) {
                return response()->json([
                    'message' => 'A patient with the same name and date of birth already exists.',
                    'code' => 'possible_duplicate', 'matches' => $dupes,
                ], 409);
            }
        }

        $patient = Patient::create($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'created',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'new_values' => $request->safe()->except(['national_id', 'phone']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        // ── Notify all admins ──
        Notification::send(
            User::role('admin')->get(),
            new NewPatientNotification($patient->full_name, $patient->mrn)
        );

        return response()->json($patient, 201);
    }

    public function show(Request $request, Patient $patient)
    {
        PatientAccess::authorize($request->user(), $patient);

        AuditLog::create([   // hospital rule: viewing a record is ALWAYS logged
            'user_id' => $request->user()->id,
            'action' => PatientAccess::viaGlass($request->user(), $patient) ? 'viewed_break_glass' : 'viewed',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $patient->load(['appointments' => function ($query) use ($request) {
            if ($this->isDoctor($request) && ! PatientAccess::viaGlass($request->user(), $request->route('patient'))) {
                $query->where('doctor_id', $this->doctorProfileId($request));
            }
        }, 'appointments.doctor.user']);

        return response()->json($patient);
    }

    public function update(UpdatePatientRequest $request, Patient $patient)
    {
        PatientAccess::authorize($request->user(), $patient);

        $old = $patient->only(['first_name', 'last_name', 'phone', 'blood_type']);
        $patient->update($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'updated',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'old_values' => $old,
            'new_values' => $request->safe()->except(['national_id', 'phone']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($patient->fresh());
    }

    public function destroy(Request $request, Patient $patient)
    {
        PatientAccess::authorize($request->user(), $patient);

        $patient->delete();  // soft delete — data is never truly gone

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'deleted',
            'auditable_type' => Patient::class,
            'auditable_id' => $patient->id,
            'old_values' => ['mrn' => $patient->mrn, 'name' => $patient->full_name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Patient archived (soft deleted)']);
    }

    private function isDoctor(Request $request): bool
    {
        return $request->user()->hasRole('doctor') && ! $request->user()->hasRole('admin');
    }

    private function isNurse(Request $request): bool
    {
        return $request->user()->hasRole('nurse') && ! $request->user()->hasRole('admin');
    }

    private function doctorProfileId(Request $request): int
    {
        $doctorId = $request->user()->staffProfile?->id;
        abort_if(! $doctorId, 403, 'No staff profile linked to this doctor account.');

        return $doctorId;
    }
}
