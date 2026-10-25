<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Prescription;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PortalRecordsController extends Controller
{
    private function me(Request $r): Patient
    {
        abort_if(! $r->user()->patient, 403, 'No patient profile linked to this account.');

        return $r->user()->patient;
    }

    /** Visit summaries — only what the doctor chose to share. */
    public function records(Request $request)
    {
        $patient = $this->me($request);
        Audit::log($request, 'viewed_records', $patient);

        return $patient->visits()
            ->with('doctor.user:id,name', 'prescription.items')
            ->orderByDesc('visited_at')
            ->get()
            ->map(fn ($v) => $v->forPatient());
    }

    public function prescriptions(Request $request)
    {
        $patient = $this->me($request);

        return Prescription::with('items', 'doctor.user:id,name', 'visit:id,visited_at,diagnosis,share_diagnosis')
            ->whereIn('visit_id', $patient->visits()->select('id'))
            ->latest()->get()
            ->map(fn ($p) => $this->prescriptionPayload($p, $patient, false));
    }

    /** Full printable prescription (header with clinic, patient and doctor). */
    public function prescription(Request $request, Prescription $prescription)
    {
        $patient = $this->me($request);
        abort_if($prescription->visit?->patient_id !== $patient->id, 403);
        $prescription->load('items', 'doctor.user:id,name', 'doctor.department:id,name', 'visit:id,visited_at,diagnosis,share_diagnosis');
        Audit::log($request, 'viewed_prescription', $prescription);

        return response()->json($this->prescriptionPayload($prescription, $patient, true));
    }

    private function prescriptionPayload(Prescription $p, Patient $patient, bool $full): array
    {
        $base = [
            'id' => $p->id,
            'status' => $p->status,
            'notes' => $p->notes,
            'issued_at' => $p->created_at,
            'doctor' => $p->doctor?->user?->name,
            'specialization' => $p->doctor?->specialization,
            'visit_date' => $p->visit?->visited_at,
            'diagnosis' => $p->visit?->share_diagnosis ? $p->visit?->diagnosis : null,
            'items' => $p->items,
        ];

        return $full ? $base + [
            'clinic' => config('app.name'),
            'department' => $p->doctor?->department?->name,
            'patient' => [
                'name' => $patient->first_name.' '.$patient->last_name,
                'mrn' => $patient->mrn,
                'date_of_birth' => $patient->date_of_birth?->toDateString(),
                'allergies' => $patient->allergies,
            ],
        ] : $base;
    }

    /** Labs + imaging. Results are invisible until staff release them. */
    public function labTests(Request $request)
    {
        $patient = $this->me($request);
        Audit::log($request, 'viewed_results', $patient);

        return $patient->labTests()->whereNotNull('released_at')
            ->with('doctor.user:id,name')
            ->orderByDesc('released_at')->get();
    }

    public function labFile(Request $request, int $labTest)
    {
        $patient = $this->me($request);
        $test = $patient->labTests()->whereNotNull('released_at')->findOrFail($labTest);
        abort_unless($test->result_file_path && Storage::disk('local')->exists($test->result_file_path), 404, 'No file attached to this result.');
        Audit::log($request, 'downloaded_result', $test);

        return Storage::disk('local')->download($test->result_file_path, $test->result_file_name ?: 'result.pdf', [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function vaccinations(Request $request)
    {
        return $this->me($request)->vaccinations()->with('administrator:id,name')->orderByDesc('administered_on')->get();
    }
}
