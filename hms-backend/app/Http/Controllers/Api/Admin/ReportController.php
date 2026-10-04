<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\StaffProfile;
use App\Models\Visit;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    private function range(Request $request): array
    {
        $from = $request->from ? Carbon::parse($request->from)->startOfDay() : now()->subDays(6)->startOfDay();
        $to = $request->to ? Carbon::parse($request->to)->endOfDay() : now()->endOfDay();

        if ($from->diffInDays($to) > 62) {
            abort(422, 'Date range too large (maximum 62 days).');
        }

        return [$from, $to];
    }

    // GET /api/admin/reports/collection?from=&to=
    public function collection(Request $request)
    {
        [$from, $to] = $this->range($request);

        $days = [];
        for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
            $base = Invoice::where('status', 'paid')->whereDate('paid_at', $d);
            $days[] = [
                'date'      => $d->format('Y-m-d'),
                'label'     => $d->format('D, M d'),
                'total'     => (float) (clone $base)->sum('amount'),
                'cash'      => (float) (clone $base)->where('payment_method', 'cash')->sum('amount'),
                'card'      => (float) (clone $base)->where('payment_method', 'card')->sum('amount'),
                'transfer'  => (float) (clone $base)->where('payment_method', 'transfer')->sum('amount'),
                'online'    => (float) (clone $base)->where('source', 'online')->sum('amount'),
                'reception' => (float) (clone $base)->where('source', 'reception')->sum('amount'),
            ];
        }

        $paid = Invoice::where('status', 'paid')->whereBetween('paid_at', [$from, $to]);

        return response()->json([
            'from'   => $from->format('Y-m-d'),
            'to'     => $to->format('Y-m-d'),
            'days'   => $days,
            'totals' => [
                'total'       => (float) (clone $paid)->sum('amount'),
                'invoices'    => (clone $paid)->count(),
                'pending_sum' => (float) Invoice::where('status', 'pending')
                                        ->whereBetween('created_at', [$from, $to])->sum('amount'),
            ],
        ]);
    }

    // GET /api/admin/reports/doctors?from=&to=
    public function doctors(Request $request)
    {
        [$from, $to] = $this->range($request);

        $doctors = StaffProfile::where('position', 'doctor')
            ->with('user:id,name', 'department:id,name')
            ->get()
            ->map(function ($doc) use ($from, $to) {
                $invoices = Invoice::where('status', 'paid')
                    ->where('doctor_id', $doc->id)
                    ->whereBetween('paid_at', [$from, $to]);

                return [
                    'id'           => $doc->id,
                    'name'         => $doc->user->name,
                    'department'   => $doc->department?->name ?? '—',
                    'revenue'      => (float) (clone $invoices)->sum('amount'),
                    'invoices'     => (clone $invoices)->count(),
                    'appointments' => Appointment::where('doctor_id', $doc->id)
                                            ->whereBetween('appointment_at', [$from, $to])->count(),
                    'visits'       => Visit::where('doctor_id', $doc->id)
                                            ->whereBetween('visited_at', [$from, $to])->count(),
                ];
            })
            ->sortByDesc('revenue')
            ->values();

        return response()->json(['doctors' => $doctors]);
    }

    // GET /api/admin/reports/export/{type}?from=&to=  → CSV
    public function export(Request $request, string $type)
    {
        [$from, $to] = $this->range($request);

        if ($type === 'collection') {
            $data = $this->collectionDays($from, $to);
            $headers = ['Date', 'Cash', 'Card', 'Transfer', 'Online', 'Reception', 'Total'];
            $rows = array_map(fn($d) => [$d['date'], $d['cash'], $d['card'], $d['transfer'], $d['online'], $d['reception'], $d['total']], $data);
        } elseif ($type === 'doctors') {
            $headers = ['Doctor', 'Department', 'Revenue', 'Invoices', 'Appointments', 'Visits'];
            $rows = StaffProfile::where('position', 'doctor')->with('user', 'department')->get()
                ->map(function ($doc) use ($from, $to) {
                    $inv = Invoice::where('status', 'paid')->where('doctor_id', $doc->id)->whereBetween('paid_at', [$from, $to]);
                    return [
                        $doc->user->name,
                        $doc->department?->name ?? '',
                        (float) (clone $inv)->sum('amount'),
                        (clone $inv)->count(),
                        Appointment::where('doctor_id', $doc->id)->whereBetween('appointment_at', [$from, $to])->count(),
                        Visit::where('doctor_id', $doc->id)->whereBetween('visited_at', [$from, $to])->count(),
                    ];
                })->all();
        } else {
            abort(404, 'Unknown report type.');
        }

        $filename = "{$type}-report-" . now()->format('Y-m-d') . '.csv';

        $callback = function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function collectionDays(Carbon $from, Carbon $to): array
    {
        $days = [];
        for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
            $base = Invoice::where('status', 'paid')->whereDate('paid_at', $d);
            $days[] = [
                'date'      => $d->format('Y-m-d'),
                'cash'      => (float) (clone $base)->where('payment_method', 'cash')->sum('amount'),
                'card'      => (float) (clone $base)->where('payment_method', 'card')->sum('amount'),
                'transfer'  => (float) (clone $base)->where('payment_method', 'transfer')->sum('amount'),
                'online'    => (float) (clone $base)->where('source', 'online')->sum('amount'),
                'reception' => (float) (clone $base)->where('source', 'reception')->sum('amount'),
                'total'     => (float) (clone $base)->sum('amount'),
            ];
        }
        return $days;
    }
}