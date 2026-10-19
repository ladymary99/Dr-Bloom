<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ward;
use Illuminate\Http\Request;

class WardController extends Controller
{
    public function index(Request $request)
    {
        $doctorId = null;
        if ($request->user()->hasRole('doctor') && ! $request->user()->hasRole('admin')) {
            $doctorId = $request->user()->staffProfile?->id;
            abort_if(! $doctorId, 403, 'No staff profile linked to this doctor account.');
        }

        return Ward::with([
            'department:id,name',
            'beds.currentAdmission' => fn ($admissions) => $admissions->when(
                $doctorId,
                fn ($query, $id) => $query->where('doctor_id', $id)
            ),
            'beds.currentAdmission.patient',
            'beds.currentAdmission.doctor.user:id,name',
        ])
            ->orderBy('name')
            ->get()
            ->map(fn($w) => [
                'id'         => $w->id,
                'name'       => $w->name,
                'code'       => $w->code,
                'department' => $w->department,
                'beds'       => $w->beds->sortBy('bed_number')->map(fn($b) => [
                    'id'         => $b->id,
                    'bed_number' => $b->bed_number,
                    'status'     => $b->status,
                    'patient'    => $b->currentAdmission?->patient,
                    'admission'  => $b->currentAdmission ? [
                        'id'          => $b->currentAdmission->id,
                        'doctor'      => $b->currentAdmission->doctor?->user?->name,
                        'admitted_at' => $b->currentAdmission->admitted_at,
                        'diagnosis'   => $b->currentAdmission->diagnosis,
                    ] : null,
                ])->values(),
            ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:wards,name',
            'code' => 'required|string|max:10|unique:wards,code',
            'department_id' => 'nullable|exists:departments,id',
        ]);

        return response()->json(Ward::create($data), 201);
    }

    public function addBed(Request $request, Ward $ward)
    {
        $data = $request->validate(['bed_number' => 'required|string|max:10']);

        return response()->json(
            $ward->beds()->create(['bed_number' => $data['bed_number'], 'status' => 'available']),
            201
        );
    }

    public function destroy(Ward $ward)
    {
        if ($ward->beds()->where('status', 'occupied')->exists()) {
            return response()->json(['message' => 'Ward has occupied beds — discharge patients first.'], 422);
        }

        $ward->delete();

        return response()->json(['message' => 'Ward removed.']);
    }
}