<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Bed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdmissionController extends Controller
{
    public function index(Request $request)
    {
        return Admission::with(
                'patient:id,mrn,first_name,last_name',
                'bed:id,bed_number,ward_id',
                'bed.ward:id,name',
                'doctor.user:id,name'
            )
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->orderByDesc('admitted_at')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id'  => 'required|uuid|exists:patients,id',
            'bed_id'      => 'required|exists:beds,id',
            'doctor_id'   => 'nullable|exists:staff_profiles,id',
            'diagnosis'   => 'nullable|string|max:2000',
            'notes'       => 'nullable|string|max:2000',
        ]);

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

    public function discharge(Admission $admission)
    {
        if ($admission->status === 'discharged') {
            return response()->json(['message' => 'Already discharged.'], 422);
        }

        DB::transaction(function () use ($admission) {
            $admission->update(['status' => 'discharged', 'discharged_at' => now()]);
            $admission->bed->update(['status' => 'available']);
        });

        return $admission->fresh();
    }
}