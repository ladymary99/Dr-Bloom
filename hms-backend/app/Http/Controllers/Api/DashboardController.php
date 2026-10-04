<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Bed;
use App\Models\Department;
use App\Models\InventoryItem;
use App\Models\Patient;
use App\Models\StaffProfile;
use App\Models\Visit;

class DashboardController extends Controller
{
    public function stats()
    {
        $weekStart = now()->startOfWeek();
        $lastWeekStart = now()->subWeek()->startOfWeek();
        $lastWeekEnd = now()->subWeek()->endOfWeek();

        $trend = function (int $current, int $previous): array {
            if ($previous === 0) {
                return ['current' => $current, 'pct' => $current > 0 ? 100 : 0, 'up' => true];
            }
            $pct = round((($current - $previous) / $previous) * 100, 1);
            return ['current' => $current, 'pct' => abs($pct), 'up' => $pct >= 0];
        };

        $chart = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->subMonths($i);
            $chart[] = [
                'label'    => $m->format('M'),
                'patients' => Patient::whereMonth('created_at', $m->month)->whereYear('created_at', $m->year)->count(),
                'visits'   => Visit::whereMonth('visited_at', $m->month)->whereYear('visited_at', $m->year)->count(),
            ];
        }

        return response()->json([
            'patients_total'        => Patient::count(),
            'doctors_on_duty'       => StaffProfile::where('position', 'doctor')->where('is_active', true)->count(),
            'departments'           => Department::where('is_active', true)->count(),
            'appointments_today'    => Appointment::whereDate('appointment_at', today())->where('status', '!=', 'cancelled')->count(),
            'appointments_upcoming' => Appointment::where('appointment_at', '>=', now())->whereIn('status', ['scheduled', 'confirmed'])->count(),
            'visits_today'          => Visit::whereDate('visited_at', today())->count(),

            'low_stock_count' => InventoryItem::whereColumn('quantity', '<=', 'min_level')->count(),
            'low_stock_items' => InventoryItem::with('department:id,name')
                                    ->whereColumn('quantity', '<=', 'min_level')
                                    ->orderBy('quantity')->limit(6)
                                    ->get(['id', 'item_name', 'quantity', 'min_level', 'unit', 'department_id']),
            'beds_total'    => Bed::count(),
            'beds_occupied' => Bed::where('status', 'occupied')->count(),

            'trends' => [
                'appointments' => $trend(
                    Appointment::whereBetween('appointment_at', [$weekStart, now()])->count(),
                    Appointment::whereBetween('appointment_at', [$lastWeekStart, $lastWeekEnd])->count()
                ),
                'patients' => $trend(
                    Patient::where('created_at', '>=', $weekStart)->count(),
                    Patient::whereBetween('created_at', [$lastWeekStart, $lastWeekEnd])->count()
                ),
                'visits' => $trend(
                    Visit::whereBetween('visited_at', [$weekStart, now()])->count(),
                    Visit::whereBetween('visited_at', [$lastWeekStart, $lastWeekEnd])->count()
                ),
            ],

            'patient_chart' => $chart,

            'upcoming' => Appointment::with(
                    'patient:id,mrn,first_name,last_name',
                    'doctor.user:id,name'
                )
                ->where('appointment_at', '>=', now())
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->orderBy('appointment_at')
                ->limit(6)
                ->get(['id', 'appointment_at', 'status', 'reason', 'patient_id', 'doctor_id']),

            'recent_activity' => AuditLog::with('user:id,name')
                ->latest()->limit(8)
                ->get(['id', 'action', 'auditable_type', 'created_at', 'user_id']),
        ]);
    }
}