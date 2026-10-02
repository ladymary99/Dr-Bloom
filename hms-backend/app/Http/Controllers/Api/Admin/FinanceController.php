<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Invoice;

class FinanceController extends Controller
{
    public function summary()
    {
        return response()->json([
            'revenue_total'  => (float) Invoice::where('status', 'paid')->sum('amount'),
            'revenue_month'  => (float) Invoice::where('status', 'paid')
                                    ->whereMonth('paid_at', now()->month)
                                    ->whereYear('paid_at', now()->year)->sum('amount'),
            'revenue_today'  => (float) Invoice::where('status', 'paid')->whereDate('paid_at', today())->sum('amount'),
            'pending_count'  => Invoice::where('status', 'pending')->count(),
            'pending_sum'    => (float) Invoice::where('status', 'pending')->sum('amount'),
            'by_department'  => Department::where('is_active', true)
                                    ->withSum(['invoices as revenue' => fn($q) => $q->where('status', 'paid')], 'amount')
                                    ->withCount('invoices')
                                    ->orderByDesc('revenue')
                                    ->get(['id', 'name', 'code']),
        ]);
    }
}