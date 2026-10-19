<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Appointment;
use App\Models\Bed;
use App\Models\Patient;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdmissionController extends Controller
{
    public function index(Request $request)
    {
        $query = Admission::with(
                'patient:id,mrn,first_name,last_name',
                'bed:id,bed_number,ward_id',
                'bed.ward:id,name',
                'doctor.user:id,name'
            );
        $this->scopeToDoctor($request, $query);

        return $query->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->orderByDesc('admitted_at')
            ->get();
    }

    public function store(Request $request)
    {
        $isDoctor = $this->isDoctor($request);
        $isNurse = $this->isNurse($request);

        $data = $request->validate([
            'patient_id'  => 'required|uuid|exists:patients,id',
            'bed_id'      => 'required|exists:beds,id',
            'doctor_id'   => 'nullable|exists:staff_profiles,id',
            'diagnosis'   => 'nullable|string|max:2000',
            'notes'       => 'nullable|string|max:2000',
        ]);

        if ($isDoctor) {
            $doctorId = $this->doctorProfileId($request);
            $patientBelongsToDoctor = Appointment::where('patient_id', $data['patient_id'])->where('doctor_id', $doctorId)->exists()
                || Visit::where('patient_id', $data['patient_id'])->where('doctor_id', $doctorId)->exists()
                || Admission::where('patient_id', $data['patient_id'])->where('doctor_id', $doctorId)->exists();
            abort_unless($patientBelongsToDoctor, 404);
            $data['doctor_id'] = $doctorId;
        } elseif ($isNurse) {
            $patient = Patient::findOrFail($data['patient_id']);
            $doctorId = $data['doctor_id'] ?? null;
            $patientHasDoctor = $doctorId && (
                Appointment::where('patient_id', $patient->id)->where('doctor_id', $doctorId)->exists()
                || Visit::where('patient_id', $patient->id)->where('doctor_id', $doctorId)->exists()
                || Admission::where('patient_id', $patient->id)->where('doctor_id', $doctorId)->exists()
            );
            abort_unless($patientHasDoctor, 422, 'Select a doctor already associated with this patient.');
        }

        $bed = Bed::findOrFail($data['bed_id']);
        if ($bed->status !== 'available') {
            return response()->json(['message' => 'This bed is not available.'], 422);
        }

        if (Admission::where('patient_id', $data['patient_id'])->where('status', 'admitted')->exists()) {
            return response()->json(['message' => 'Patient already has an active admission.'], 422);
        }

        $admission = DB::transaction(function () use ($data, $bed) {
            $admission = Admission::create([
                ...$data,
                'admitted_at' => now(),
                'status'      => 'admitted',
            ]);
            $bed->update(['status' => 'occupied']);
            return $admission;
        });

        return response()->json($admission->load('patient', 'bed.ward', 'doctor.user'), 201);
    }

    public function discharge(Request $request, Admission $admission)
    {
        if ($this->isDoctor($request)) {
            abort_if($admission->doctor_id !== $this->doctorProfileId($request), 404);
        }

        if ($admission->status === 'discharged') {
            return response()->json(['message' => 'Already discharged.'], 422);
        }

        DB::transaction(function () use ($admission) {
            $admission->update(['status' => 'discharged', 'discharged_at' => now()]);
            $admission->bed->update(['status' => 'available']);
        });

        return $admission->fresh();
    }

    private function scopeToDoctor(Request $request, Builder $query): void
    {
        if ($this->isDoctor($request)) {
            $query->where('doctor_id', $this->doctorProfileId($request));
        }
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