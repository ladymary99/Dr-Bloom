<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    private const KEYS = ['hospital_name', 'address', 'phone', 'email', 'working_hours', 'announcement', 'consultation_fee'];

    public function index()
    {
        $rows = Setting::whereIn('key', self::KEYS)->pluck('value', 'key');

        return response()->json([
            'hospital_name' => $rows['hospital_name'] ?? 'Dr-Bloom Hospital',
            'address'       => $rows['address'] ?? '',
            'phone'         => $rows['phone'] ?? '',
            'email'         => $rows['email'] ?? '',
            'working_hours' => $rows['working_hours'] ?? '',
            'announcement'  => $rows['announcement'] ?? '',
            'consultation_fee' => $rows['consultation_fee'] ?? '0',
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'hospital_name' => 'nullable|string|max:150',
            'address'       => 'nullable|string|max:255',
            'phone'         => 'nullable|string|max:30',
            'email'         => 'nullable|email|max:150',
            'working_hours' => 'nullable|string|max:150',
            'announcement'  => 'nullable|string|max:500',
            'consultation_fee' => 'nullable|numeric|min:0',
        ]);

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Settings saved.']);
    }
}