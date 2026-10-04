<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Invoice;
use Illuminate\Http\Request;

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

        $invoice = Invoice::create([
            ...$data,
            'paid_at' => ($data['status'] ?? 'pending') === 'paid' ? now() : null,
            'created_by' => $request->user()->id,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'created',
            'auditable_type' => Invoice::class,
            'auditable_id' => $invoice->id,
            'new_values' => ['number' => $invoice->invoice_number, 'amount' => $invoice->amount, 'status' => $invoice->status],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

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

        $invoice->update([
            'status' => $data['status'],
            'payment_method' => $data['status'] === 'paid' ? ($data['payment_method'] ?? $invoice->payment_method) : null,
            'paid_at' => $data['status'] === 'paid' ? ($invoice->paid_at ?? now()) : null,
        ]);

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

        return response()->json($invoice->fresh());
    }
}