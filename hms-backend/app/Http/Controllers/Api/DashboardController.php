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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();
        $isDoctor = $user->hasRole('doctor') && ! $user->hasRole('admin');
        $doctorId = $isDoctor ? $user->staffProfile?->id : null;
        abort_if($isDoctor && ! $doctorId, 403, 'No staff profile linked to this doctor account.');

        if ($isDoctor) {
            return response()->json([
                ...$this->computeStats($doctorId, $user->id),
                'my_department' => $user->staffProfile?->department()
                    ->first(['id', 'name', 'code']),
            ]);
        }

        $stats = Cache::remember('dashboard-stats', 30, function () {
            return $this->computeStats(null, 0);
        });
        $myDepartment = $user->hasRole('nurse')
            ? $user->staffProfile?->department()->first(['id', 'name', 'code'])
            : null;

        return response()->json([...$stats, 'my_department' => $myDepartment]);
    }

    /**
     * Clear cached dashboard stats (call after actions that change the numbers).
     */
    public static function flushStatsCache(): void
    {
        Cache::forget('dashboard-stats');
    }

    private function computeStats(?int $doctorId, int $userId): array
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

        $patientsForDoctor = fn ($query) => $query->where(function ($patients) use ($doctorId) {
            $patients->whereHas('appointments', fn ($appointments) => $appointments->where('doctor_id', $doctorId))
                ->orWhereHas('visits', fn ($visits) => $visits->where('doctor_id', $doctorId))
                ->orWhereHas('admissions', fn ($admissions) => $admissions->where('doctor_id', $doctorId));
        });

        $patientsByMonth = Patient::query()
            ->when($doctorId, $patientsForDoctor)
            ->selectRaw("$patientMonthExpression as month_key, COUNT(*) as count")
            ->where('created_at', '>=', $chartFrom)
            ->groupByRaw($patientMonthExpression)
            ->pluck('count', 'month_key');

        $visitsByMonth = Visit::selectRaw("$visitMonthExpression as month_key, COUNT(*) as count")
            ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))
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
            'patients_total'        => Patient::query()->when($doctorId, $patientsForDoctor)->count(),
            'doctors_on_duty'       => StaffProfile::where('position', 'doctor')->where('is_active', true)->count(),
            'departments'           => Department::where('is_active', true)->count(),
            'appointments_today'    => Appointment::where('appointment_at', '>=', today())
                                                ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))
                                                ->where('appointment_at', '<', today()->addDay())
                                                ->where('status', '!=', 'cancelled')->count(),
            'appointments_upcoming' => Appointment::where('appointment_at', '>=', now())
                                                ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))
                                                ->whereIn('status', ['scheduled', 'confirmed'])->count(),
            'visits_today'          => Visit::where('visited_at', '>=', today())
                                                ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))
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
                    Appointment::whereBetween('appointment_at', [$weekStart, now()])
                        ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))->count(),
                    Appointment::whereBetween('appointment_at', [$lastWeekStart, $lastWeekEnd])
                        ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))->count()
                ),
                'patients' => $trend(
                    Patient::query()->when($doctorId, $patientsForDoctor)->where('created_at', '>=', $weekStart)->count(),
                    Patient::query()->when($doctorId, $patientsForDoctor)->whereBetween('created_at', [$lastWeekStart, $lastWeekEnd])->count()
                ),
                'visits' => $trend(
                    Visit::whereBetween('visited_at', [$weekStart, now()])
                        ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))->count(),
                    Visit::whereBetween('visited_at', [$lastWeekStart, $lastWeekEnd])
                        ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))->count()
                ),
            ],

            'patient_chart' => $chart,
            'dept_performance' => $departmentPerformance,

            'upcoming' => Appointment::with(
                    'patient:id,mrn,first_name,last_name',
                    'doctor.user:id,name'
                )
                ->where('appointment_at', '>=', now())
                ->when($doctorId, fn ($query, $id) => $query->where('doctor_id', $id))
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->orderBy('appointment_at')
                ->limit(6)
                ->get(['id', 'appointment_at', 'status', 'reason', 'patient_id', 'doctor_id']),

            'recent_activity' => AuditLog::with('user:id,name')
                ->when($doctorId, fn ($query) => $query->where('user_id', $userId))
                ->latest()->limit(8)
                ->get(['id', 'action', 'auditable_type', 'created_at', 'user_id']),
        ];
    }
}