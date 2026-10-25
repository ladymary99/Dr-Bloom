<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InsuranceClaim;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\PaymentReceivedNotification;
use App\Support\Audit;
use App\Support\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/** Reception/finance side of the ledger. The invoice's paid amount and status are always derived from payments. */
class BillingController extends Controller
{
    public function show(Invoice $invoice)
    {
        return $invoice->load('patient:id,mrn,first_name,last_name', 'items', 'payments', 'claims', 'doctor.user:id,name', 'department:id,name');
    }

    public function addItem(Request $request, Invoice $invoice)
    {
        abort_if(in_array($invoice->status, ['paid', 'refunded', 'cancelled'], true), 422, 'This invoice is closed and cannot be changed.');
        $data = $request->validate([
            'description' => 'required|string|max:255',
            'quantity' => 'required|numeric|min:0.01|max:9999',
            'unit_price' => 'required|numeric|min:0|max:9999999',
        ]);

        DB::transaction(function () use ($invoice, $data) {
            InvoiceItem::create($data + ['invoice_id' => $invoice->id]);
            $invoice->update(['amount' => $invoice->items()->sum(DB::raw('quantity * unit_price'))]);
            $invoice->recalculate();
        });
        Audit::log($request, 'invoice_item_added', $invoice, null, [], ['description' => $data['description']]);

        return $this->show($invoice->fresh());
    }

    public function recordPayment(Request $request, Invoice $invoice)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:9999999',
            'method' => 'required|in:cash,card,bank_transfer,insurance,other',
            'notes' => 'nullable|string|max:300',
        ]);
        abort_if(in_array($invoice->status, ['paid', 'cancelled', 'refunded'], true), 422, 'Nothing left to pay on this invoice.');

        $payment = DB::transaction(function () use ($invoice, $data, $request) {
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->first(); // serialize concurrent cashiers
            abort_if((float) $data['amount'] - (float) $invoice->balance > 0.005, 422, "Amount exceeds the balance of {$invoice->balance}.");

            $payment = Payment::create($data + ['invoice_id' => $invoice->id, 'status' => 'pending', 'recorded_by' => $request->user()->id]);
            $payment->markSucceeded();
            $invoice->update(['payment_method' => $data['method']]);
            $invoice->recalculate();

            return $payment;
        });
        Audit::log($request, 'payment_recorded', $invoice, null, [], ['amount' => $payment->amount, 'method' => $payment->method, 'receipt' => $payment->receipt_number]);

        $invoice = $invoice->fresh();
        Notification::send(User::role('admin')->get(), new PaymentReceivedNotification($invoice->invoice_number, (float) $payment->amount));
        if ($invoice->patient) {
            Notify::patient($invoice->patient()->with('user')->first(), 'payment_received',
                "We received your payment of {$payment->amount} for {$invoice->invoice_number}.", '/portal/billing',
                "Receipt {$payment->receipt_number}", 'billing');
        }

        return $this->show($invoice);
    }

    public function refund(Request $request, Payment $payment)
    {
        abort_if($payment->status !== 'succeeded', 422, 'Only successful payments can be refunded.');
        $request->validate(['reason' => 'required|string|max:300']);

        DB::transaction(function () use ($payment, $request) {
            $payment->update(['status' => 'refunded', 'notes' => 'Refunded: '.$request->reason]);
            $payment->invoice->recalculate();
        });
        Audit::log($request, 'payment_refunded', $payment, null, [], ['amount' => $payment->amount]);

        return $this->show($payment->invoice->fresh());
    }

    // ───────────── insurance claims ─────────────

    public function claims(Request $request)
    {
        return InsuranceClaim::with('patient:id,mrn,first_name,last_name', 'invoice:id,invoice_number,amount,status')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest()->paginate(20);
    }

    public function storeClaim(Request $request, Invoice $invoice)
    {
        abort_if(! $invoice->patient_id, 422, 'This invoice has no patient.');
        $data = $request->validate([
            'provider' => 'required|string|max:120',
            'claim_number' => 'nullable|string|max:60',
            'amount_claimed' => 'required|numeric|min:0|max:'.(float) $invoice->amount,
            'notes' => 'nullable|string|max:1000',
        ]);

        $claim = InsuranceClaim::create($data + [
            'invoice_id' => $invoice->id, 'patient_id' => $invoice->patient_id,
            'status' => 'submitted', 'submitted_at' => now(), 'created_by' => $request->user()->id,
        ]);
        Audit::log($request, 'claim_submitted', $claim);

        return response()->json($claim, 201);
    }

    public function updateClaim(Request $request, InsuranceClaim $claim)
    {
        $data = $request->validate([
            'status' => 'required|in:submitted,in_review,approved,rejected,paid',
            'amount_approved' => 'nullable|numeric|min:0|max:'.(float) $claim->amount_claimed,
            'claim_number' => 'nullable|string|max:60',
            'notes' => 'nullable|string|max:1000',
        ]);
        if (in_array($data['status'], ['approved', 'paid'], true) && ! isset($data['amount_approved'])) {
            $data['amount_approved'] = $claim->amount_approved ?? $claim->amount_claimed;
        }
        $changed = $data['status'] !== $claim->status;
        $claim->update($data + ['resolved_at' => in_array($data['status'], ['approved', 'rejected', 'paid'], true) ? ($claim->resolved_at ?? now()) : null]);

        DB::transaction(function () use ($claim, $request, $data, $changed) {
            // when the insurer pays, book it into the ledger exactly once
            if ($data['status'] === 'paid' && $changed) {
                $payment = Payment::create([
                    'invoice_id' => $claim->invoice_id, 'amount' => max(0.01, (float) $claim->amount_approved), 'method' => 'insurance',
                    'status' => 'pending', 'recorded_by' => $request->user()->id, 'notes' => "Claim {$claim->claim_number}",
                ]);
                $payment->markSucceeded();
                $claim->invoice->recalculate();
            }
        });
        Audit::log($request, 'claim_updated', $claim, null, [], ['status' => $data['status']]);

        if ($changed && ($patient = $claim->patient()->with('user')->first())) {
            Notify::patient($patient, 'claim_update', "Your insurance claim for {$claim->invoice->invoice_number} is now {$data['status']}.",
                '/portal/billing', 'Insurance claim update', 'billing');
        }

        return $claim->fresh()->load('patient:id,mrn,first_name,last_name', 'invoice:id,invoice_number');
    }
}
