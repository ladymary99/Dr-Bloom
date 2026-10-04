<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Invoice;
use Illuminate\Http\Request;


class FinanceController extends Controller
{
        public function summary()
    {
        $week = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $week[] = [
                'label' => $day->format('D'),
                'total' => (float) Invoice::where('status', 'paid')->whereDate('paid_at', $day)->sum('amount'),
            ];
        }

        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = now()->subMonths($i);
            $months[] = [
                'label' => $m->format('M'),
                'total' => (float) Invoice::where('status', 'paid')
                                    ->whereMonth('paid_at', $m->month)
                                    ->whereYear('paid_at', $m->year)->sum('amount'),
            ];
        }

        return response()->json([
            'revenue_total'   => (float) Invoice::where('status', 'paid')->sum('amount'),
            'revenue_today'   => (float) Invoice::where('status', 'paid')->whereDate('paid_at', today())->sum('amount'),
            'revenue_week'    => (float) Invoice::where('status', 'paid')->where('paid_at', '>=', now()->startOfWeek())->sum('amount'),
            'revenue_month'   => (float) Invoice::where('status', 'paid')
                                        ->whereMonth('paid_at', now()->month)
                                        ->whereYear('paid_at', now()->year)->sum('amount'),
            'pending_count'   => Invoice::where('status', 'pending')->count(),
            'pending_sum'     => (float) Invoice::where('status', 'pending')->sum('amount'),
            'by_source'       => [
                'online'    => (float) Invoice::where('status', 'paid')->where('source', 'online')->sum('amount'),
                'reception' => (float) Invoice::where('status', 'paid')->where('source', 'reception')->sum('amount'),
            ],
            'by_department'   => Department::where('is_active', true)
                                        ->withSum(['invoices as revenue' => fn($q) => $q->where('status', 'paid')], 'amount')
                                        ->withCount('invoices')
                                        ->orderByDesc('revenue')
                                        ->get(['id', 'name', 'code']),
            'weekly'          => $week,
            'monthly'         => $months,
        ]);
    }

    // GET /api/admin/finance/export — CSV (opens in Excel)
    public function export(Request $request)
    {
        $invoices = Invoice::with(
                'patient:id,mrn,first_name,last_name',
                'doctor.user:id,name',
                'department:id,name'
            )
            ->when($request->from, fn($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to, fn($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when($request->department_id, fn($q, $v) => $q->where('department_id', $v))
            ->orderByDesc('created_at')
            ->get();

        $callback = function () use ($invoices) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Invoice #', 'Date', 'Patient', 'MRN', 'Doctor', 'Department', 'Description', 'Amount', 'Method', 'Source', 'Status']);
            foreach ($invoices as $inv) {
                fputcsv($out, [
                    $inv->invoice_number,
                    $inv->created_at->format('Y-m-d'),
                    $inv->patient ? $inv->patient->first_name . ' ' . $inv->patient->last_name : '',
                    $inv->patient?->mrn ?? '',
                    $inv->doctor?->user?->name ?? '',
                    $inv->department?->name ?? '',
                    $inv->description,
                    $inv->amount,
                    $inv->payment_method ?? '',
                    $inv->source,
                    $inv->status,
                ]);
            }
            fclose($out);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="income-report-' . now()->format('Y-m-d') . '.csv"',
        ]);
    }
}