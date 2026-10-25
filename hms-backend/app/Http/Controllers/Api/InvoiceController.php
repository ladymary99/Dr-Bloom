<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Notifications\PaymentReceivedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class InvoiceController extends Controller
{
    // GET /api/invoices?department_id=2&status=pending&from=2026-10-01&to=2026-10-31
    public function index(Request $request)
    {
        $invoices = Invoice::with(
                  'patient:id,mrn,first_name,last_name',
                'doctor.user:id,name',
                'department:id,name,code',
                'creator:id,name'
            )
            ->when($request->department_id, fn($q, $v) => $q->where('department_id', $v))
            ->when($request->status, fn($q, $v) => $q->where('status', $v))
            ->when($request->from, fn($q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($request->to, fn($q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest()
            ->paginate(15);

        return response()->json($invoices);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'nullable|uuid|exists:patients,id',
            'department_id' => 'nullable|exists:departments,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01|max:9999999',
            'status' => 'in:pending,paid',
            'payment_method' => 'nullable|string|max:20',
             'doctor_id' => 'nullable|exists:staff_profiles,id',
            'source' => 'in:online,reception',
        ]);

        $wantsPaid = ($data['status'] ?? 'pending') === 'paid';
        $invoice = DB::transaction(function () use ($data, $request, $wantsPaid) {
            $invoice = Invoice::create([
                ...collect($data)->except(['status'])->all(),
                'status' => 'pending',
                'created_by' => $request->user()->id,
            ]);
            InvoiceItem::create(['invoice_id' => $invoice->id, 'description' => $data['description'], 'quantity' => 1, 'unit_price' => $data['amount']]);
            if ($wantsPaid) {
                $this->settle($invoice, $data['payment_method'] ?? 'cash', $request->user()->id);
            }

            return $invoice->fresh();
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'created',
            'auditable_type' => Invoice::class,
            'auditable_id' => $invoice->id,
            'new_values' => ['number' => $invoice->invoice_number, 'amount' => $invoice->amount, 'status' => $invoice->status],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        // ── Notify admins if already paid ──
        if ($invoice->status === 'paid') {
            Notification::send(
                User::role('admin')->get(),
                new PaymentReceivedNotification($invoice->invoice_number, (float) $invoice->amount)
            );
        }

        return response()->json($invoice->load('patient', 'department'), 201);
    }

    // PUT /api/invoices/{invoice}  — mark paid / cancel
    public function update(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,paid,cancelled',
            'payment_method' => 'required_if:status,paid|string|max:20',
        ]);

        $old = $invoice->only(['status', 'amount']);
        $becamePaid = $old['status'] !== 'paid' && $data['status'] === 'paid';

        if ($data['status'] === 'pending' && (float) $invoice->amount_paid > 0) {
            return response()->json(['message' => 'This invoice has payments recorded. Refund them instead of reopening it.'], 422);
        }
        if ($data['status'] === 'cancelled' && (float) $invoice->amount_paid > 0) {
            return response()->json(['message' => 'Refund the recorded payments before cancelling this invoice.'], 422);
        }

        DB::transaction(function () use ($invoice, $data, $request) {
            if ($data['status'] === 'paid') {
                $this->settle($invoice, $data['payment_method'] ?? 'cash', $request->user()->id);
            } else {
                $invoice->update(['status' => $data['status'], 'paid_at' => null]);
            }
        });
        $invoice = $invoice->fresh();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'updated',
            'auditable_type' => Invoice::class,
            'auditable_id' => $invoice->id,
            'old_values' => $old,
            'new_values' => ['status' => $invoice->status, 'amount' => $invoice->amount],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        // ── Notify admins on payment ──
        if ($becamePaid) {
            Notification::send(
                User::role('admin')->get(),
                new PaymentReceivedNotification($invoice->invoice_number, (float) $invoice->amount)
            );
        }

        return response()->json($invoice->fresh());
    }

    /** "Mark as paid" = record a payment for whatever is still owed, so the ledger and receipts stay truthful. */
    private function settle(Invoice $invoice, string $method, int $userId): void
    {
        $balance = (float) $invoice->amount - (float) $invoice->amount_paid;
        if ($balance > 0.004) {
            $method = in_array($method, ['cash', 'card', 'bank_transfer', 'insurance'], true) ? $method : 'other';
            $payment = Payment::create(['invoice_id' => $invoice->id, 'amount' => $balance, 'method' => $method, 'status' => 'pending', 'recorded_by' => $userId]);
            $payment->markSucceeded();
        }
        $invoice->update(['payment_method' => $method]);
        $invoice->recalculate();
    }
}
