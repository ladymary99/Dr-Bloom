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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats()
    {
        return response()->json(
            Cache::remember('dashboard-stats', 30, function () {
                return $this->computeStats();
            })
        );
    }

    /**
     * Clear cached dashboard stats (call after actions that change the numbers).
     */
    public static function flushStatsCache(): void
    {
        Cache::forget('dashboard-stats');
    }

    private function computeStats(): array
    {
        $weekStart = now()->startOfWeek();
        $lastWeekStart = now()->subWeek()->startOfWeek();
        $lastWeekEnd = now()->subWeek()->endOfWeek();
        $monthStart = now()->startOfMonth();
        $previousMonthStart = now()->subMonth()->startOfMonth();
        $chartFrom = now()->subMonths(11)->startOfMonth();
        $monthExpression = match (DB::connection()->getDriverName()) {
            'mysql', 'mariadb' => "DATE_FORMAT(%s, '%Y-%m')",
            'pgsql' => "TO_CHAR(%s, 'YYYY-MM')",
            'sqlsrv' => "FORMAT(%s, 'yyyy-MM')",
            'sqlite' => "strftime('%Y-%m', %s)",
            default => throw new \RuntimeException('Unsupported database driver for dashboard statistics.'),
        };

        $trend = function (int $current, int $previous): array {
            if ($previous === 0) {
                return ['current' => $current, 'pct' => $current > 0 ? 100 : 0, 'up' => true];
            }
            $pct = round((($current - $previous) / $previous) * 100, 1);
            return ['current' => $current, 'pct' => abs($pct), 'up' => $pct >= 0];
        };

        $patientMonthExpression = sprintf($monthExpression, 'created_at');
        $visitMonthExpression = sprintf($monthExpression, 'visited_at');

        $patientsByMonth = Patient::selectRaw("$patientMonthExpression as month_key, COUNT(*) as count")
            ->where('created_at', '>=', $chartFrom)
            ->groupByRaw($patientMonthExpression)
            ->pluck('count', 'month_key');

        $visitsByMonth = Visit::selectRaw("$visitMonthExpression as month_key, COUNT(*) as count")
            ->where('visited_at', '>=', $chartFrom)
            ->groupByRaw($visitMonthExpression)
            ->pluck('count', 'month_key');

        $chart = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->subMonths($i);
            $k = $m->format('Y-m');
            $chart[] = [
                'label'    => $m->format('M'),
                'patients' => (int) ($patientsByMonth[$k] ?? 0),
                'visits'   => (int) ($visitsByMonth[$k] ?? 0),
            ];
        }

        $departmentPerformance = DB::table('invoices')
            ->join('departments', 'invoices.department_id', '=', 'departments.id')
            ->where('invoices.status', 'paid')
            ->whereBetween('invoices.paid_at', [$previousMonthStart, now()])
            ->selectRaw('
                departments.name as name,
                SUM(CASE WHEN invoices.paid_at >= ? THEN invoices.amount ELSE 0 END) as current,
                SUM(CASE WHEN invoices.paid_at < ? THEN invoices.amount ELSE 0 END) as previous
            ', [$monthStart, $monthStart])
            ->groupBy('departments.id', 'departments.name')
            ->orderByDesc('current')
            ->limit(8)
            ->get()
            ->map(fn ($department) => [
                'name' => $department->name,
                'current' => (float) $department->current,
                'previous' => (float) $department->previous,
            ])
            ->values();

        return [
            'patients_total'        => Patient::count(),
            'doctors_on_duty'       => StaffProfile::where('position', 'doctor')->where('is_active', true)->count(),
            'departments'           => Department::where('is_active', true)->count(),
            'appointments_today'    => Appointment::where('appointment_at', '>=', today())
                                                ->where('appointment_at', '<', today()->addDay())
                                                ->where('status', '!=', 'cancelled')->count(),
            'appointments_upcoming' => Appointment::where('appointment_at', '>=', now())->whereIn('status', ['scheduled', 'confirmed'])->count(),
            'visits_today'          => Visit::where('visited_at', '>=', today())
                                                ->where('visited_at', '<', today()->addDay())->count(),

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
            'dept_performance' => $departmentPerformance,

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
        ];
    }
}