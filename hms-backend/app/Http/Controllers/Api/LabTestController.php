<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LabTest;
use Illuminate\Http\Request;

class LabTestController extends Controller
{
    // GET /api/lab-tests?status=ordered&patient_id=
    public function index(Request $request)
    {
        return LabTest::with('patient:id,mrn,first_name,last_name', 'doctor.user:id,name', 'visit:id,visited_at')
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->patient_id, fn($q, $v) => $q->where('patient_id', $v))
            ->orderByRaw("CASE status WHEN 'ordered' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->limit(200)
            ->get();
    }

    // POST /api/lab-tests — doctor orders a test
    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'visit_id'   => 'nullable|uuid|exists:visits,id',
            'test_name'  => 'required|string|max:150',
            'notes'      => 'nullable|string|max:1000',
        ]);

        $labTest = LabTest::create([
            ...$data,
            'doctor_id' => $request->user()->staffProfile?->id,
        ]);

        return response()->json($labTest->load('patient', 'doctor.user'), 201);
    }

    public function show(LabTest $labTest)
    {
        return $labTest->load('patient:id,mrn,first_name,last_name', 'doctor.user:id,name', 'visit');
    }

    // PUT /api/lab-tests/{labTest} — status + result entry
    public function update(Request $request, LabTest $labTest)
    {
        $data = $request->validate([
            'status' => 'sometimes|in:ordered,in_progress,completed,cancelled',
            'result' => 'required_if:status,completed|nullable|string|max:5000',
            'notes'  => 'nullable|string|max:1000',
        ]);

        if (($data['status'] ?? null) === 'completed') {
            $data['completed_at'] = now();
        }

        $labTest->update($data);

        return $labTest->fresh();
    }
}