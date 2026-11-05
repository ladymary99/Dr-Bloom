<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use Illuminate\Http\Request;

class BedController extends Controller
{
    public function update(Request $request, Bed $bed)
    {
        $data = $request->validate([
            'status' => 'sometimes|in:available,maintenance',
            'is_isolation' => 'sometimes|boolean',
        ]);

        if ($bed->status === 'occupied' && isset($data['status'])) {
            return response()->json(['message' => 'Discharge the patient first.'], 422);
        }

        $bed->update($data);

        return $bed->fresh();
    }

    // PUT /api/beds/{bed}/cleaned — housekeeping finished; the bed can be assigned again
    public function cleaned(Request $request, Bed $bed)
    {
        $bed->update(['cleaning_status' => 'clean']);
        \App\Support\Audit::log($request, 'bed_cleaned', $bed);

        return $bed->fresh();
    }
}
