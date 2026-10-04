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
            'status' => 'required|in:available,maintenance',
        ]);

        if ($bed->status === 'occupied') {
            return response()->json(['message' => 'Discharge the patient first.'], 422);
        }

        $bed->update($data);

        return $bed->fresh();
    }
}