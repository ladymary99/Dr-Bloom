<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\Request;

class DoctorQueueController extends Controller
{
    // GET /api/doctor/queue?date=2026-10-02&doctor_id=1
    public function index(Request $request)
    {
        $myProfileId = $request->user()->staffProfile?->id;

        $query = Appointment::with(
                'patient:id,mrn,first_name,last_name,date_of_birth,gender,blood_type,allergies',
                'department:id,name'
            )
            ->whereDate('appointment_at', $request->date ?: today())
            ->orderBy('appointment_at');

        if ($request->doctor_id) {
            $query->where('doctor_id', $request->doctor_id);  // admin: view any doctor
        } elseif ($myProfileId) {
            $query->where('doctor_id', $myProfileId);          // doctor: own queue
        }
        // admins (no staff profile) see the full hospital queue

        return response()->json($query->get());
    }
}