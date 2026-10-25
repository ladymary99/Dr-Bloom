<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LabTest;
use App\Support\Audit;
use App\Support\Notify;
use App\Support\Security\UploadInspector;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
            'category'   => 'nullable|in:lab,imaging',
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

    // POST /api/lab-tests/{labTest}/file — attach a PDF/image result (validated server-side, private disk)
    public function uploadFile(Request $request, LabTest $labTest)
    {
        $request->validate(['file' => 'required|file|max:10240']);
        $file = $request->file('file');

        try {
            $info = UploadInspector::inspect($file->getRealPath(), $file->getClientOriginalName(), 10 * 1048576,
                array_intersect_key(UploadInspector::MEDICAL, array_flip(['pdf', 'jpg', 'jpeg', 'png'])), (bool) config('services.clamav.enabled'));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // random server-side name; the client's file name is never used on disk
        $path = "lab-results/{$labTest->patient_id}/".Str::uuid().'.'.$info['extension'];
        Storage::disk('local')->put($path, file_get_contents($file->getRealPath()));
        if ($labTest->result_file_path) {
            Storage::disk('local')->delete($labTest->result_file_path);
        }

        $labTest->update([
            'result_file_path' => $path,
            'result_file_name' => Str::limit(preg_replace('/[^\w.\- ]+/u', '_', $file->getClientOriginalName()), 150, ''),
            'result_file_size' => $info['size'],
        ]);
        Audit::log($request, 'lab_file_uploaded', $labTest);

        return $labTest->fresh();
    }

    // GET /api/lab-tests/{labTest}/file — staff download
    public function downloadFile(Request $request, LabTest $labTest)
    {
        abort_unless($labTest->result_file_path && Storage::disk('local')->exists($labTest->result_file_path), 404);
        Audit::log($request, 'lab_file_viewed', $labTest);

        return Storage::disk('local')->download($labTest->result_file_path, $labTest->result_file_name ?: 'result', ['X-Content-Type-Options' => 'nosniff']);
    }

    // POST /api/lab-tests/{labTest}/release  {released: true|false} — show/hide the result for the patient
    public function release(Request $request, LabTest $labTest)
    {
        $data = $request->validate(['released' => 'required|boolean']);
        if ($data['released']) {
            abort_if($labTest->status !== 'completed', 422, 'Only completed results can be released to the patient.');
            abort_if(! $labTest->result && ! $labTest->result_file_path, 422, 'Add a result or attach a file before releasing.');
        }

        $wasReleased = (bool) $labTest->released_at;
        $labTest->update(['released_at' => $data['released'] ? ($labTest->released_at ?? now()) : null]);
        Audit::log($request, $data['released'] ? 'lab_result_released' : 'lab_result_hidden', $labTest);

        if ($data['released'] && ! $wasReleased && ($patient = $labTest->patient()->with('user')->first())) {
            Notify::patient($patient, 'result_ready', "Your result \"{$labTest->test_name}\" is now available.", '/portal/records',
                'A new result is available');
        }

        return $labTest->fresh();
    }
}
