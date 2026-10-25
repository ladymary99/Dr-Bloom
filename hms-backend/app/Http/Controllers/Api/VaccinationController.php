<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Vaccination;
use App\Support\Audit;
use App\Support\Notify;
use Illuminate\Http\Request;

/** Clinical staff record vaccinations; patients see them read-only in their portal. */
class VaccinationController extends Controller
{
    public function index(Patient $patient)
    {
        return $patient->vaccinations()->with('administrator:id,name')->orderByDesc('administered_on')->get();
    }

    public function store(Request $request, Patient $patient)
    {
        $data = $request->validate([
            'vaccine_name' => 'required|string|max:150',
            'dose_number' => 'nullable|integer|min:1|max:10',
            'administered_on' => 'required|date|before_or_equal:today',
            'next_due_on' => 'nullable|date|after:administered_on',
            'lot_number' => 'nullable|string|max:60',
            'notes' => 'nullable|string|max:1000',
        ]);

        $v = $patient->vaccinations()->create($data + ['administered_by' => $request->user()->id]);
        Audit::log($request, 'vaccination_recorded', $v, null, [], ['patient_id' => $patient->id, 'vaccine' => $v->vaccine_name]);
        Notify::patient($patient->load('user'), 'vaccination', "{$v->vaccine_name} was added to your vaccination record.", '/portal/records');

        return response()->json($v->load('administrator:id,name'), 201);
    }

    public function destroy(Request $request, Patient $patient, Vaccination $vaccination)
    {
        abort_if($vaccination->patient_id !== $patient->id, 404);
        Audit::log($request, 'vaccination_deleted', $vaccination);
        $vaccination->delete();

        return response()->json(['message' => 'Vaccination record removed.']);
    }
}
