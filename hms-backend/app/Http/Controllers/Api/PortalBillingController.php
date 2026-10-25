<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\Payment;
use App\Support\Audit;
use App\Support\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class PortalBillingController extends Controller
{
    private function me(Request $r): Patient
    {
        abort_if(! $r->user()->patient, 403, 'No patient profile linked to this account.');

        return $r->user()->patient;
    }


    private function query(Patient $patient)
    {
        return $patient->invoices()->with([
            'items', 'claims', 'department:id,name', 'doctor.user:id,name',
            'payments' => fn ($q) => $q->whereIn('status', ['succeeded', 'refunded'])->orderByDesc('paid_at'),
        ]);
    }

    public function invoices(Request $request)
    {
        return $this->query($this->me($request))->orderByDesc('created_at')->get();
    }

    public function invoice(Request $request, int $invoice)
    {
        return $this->query($this->me($request))->findOrFail($invoice);
    }

    public function claims(Request $request)
    {
        return \App\Models\InsuranceClaim::where('patient_id', $this->me($request)->id)
            ->with('invoice:id,invoice_number,description')->latest()->get();
    }

    /** Start an online card payment (Stripe Checkout). */
    public function pay(Request $request, int $invoice)
    {
        $patient = $this->me($request);
        $inv = $patient->invoices()->findOrFail($invoice);

        if (! in_array($inv->status, ['pending', 'partial'], true) || (float) $inv->balance <= 0) {
            return response()->json(['message' => 'This invoice has nothing left to pay.'], 422);
        }
        if (! config('services.stripe.secret')) {
            return response()->json(['message' => 'Online payments are not enabled yet. Please pay at the reception desk.', 'code' => 'payments_disabled'], 503);
        }

        $amount = (float) $inv->balance;
        $payment = Payment::create([
            'invoice_id' => $inv->id, 'amount' => $amount, 'method' => 'stripe', 'status' => 'pending',
        ]);
        // abandon earlier unfinished checkouts for this invoice
        Payment::where('invoice_id', $inv->id)->where('status', 'pending')->where('id', '!=', $payment->id)->update(['status' => 'failed']);

        $front = rtrim((string) env('FRONTEND_URL', config('app.url')), '/');
        $res = Http::asForm()->withToken(config('services.stripe.secret'))->timeout(15)
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode' => 'payment',
                'success_url' => "$front/portal/billing?paid={$inv->invoice_number}",
                'cancel_url' => "$front/portal/billing?cancelled={$inv->invoice_number}",
                'customer_email' => $request->user()->email,
                'client_reference_id' => $payment->id,
                'metadata[payment_id]' => $payment->id,
                'metadata[invoice_id]' => $inv->id,
                'line_items[0][quantity]' => 1,
                'line_items[0][price_data][currency]' => config('services.stripe.currency', 'usd'),
                'line_items[0][price_data][unit_amount]' => (int) round($amount * 100),
                'line_items[0][price_data][product_data][name]' => "Invoice {$inv->invoice_number}",
            ]);

        if ($res->failed() || ! $res->json('url')) {
            $payment->update(['status' => 'failed']);
            report(new \RuntimeException('Stripe checkout failed: '.$res->status()));

            return response()->json(['message' => 'The payment provider is unavailable. Please try again or pay at reception.'], 502);
        }
        $payment->update(['gateway_ref' => $res->json('id')]);
        Audit::log($request, 'payment_started', $inv, null, [], ['amount' => $amount]);

        return response()->json(['url' => $res->json('url')]);
    }

    /** Printable receipt data (the browser's "Save as PDF" turns it into a PDF). */
    public function receipt(Request $request, string $payment)
    {
        $patient = $this->me($request);
        $p = Payment::with('invoice.items')->findOrFail($payment);
        abort_if($p->invoice?->patient_id !== $patient->id || $p->status !== 'succeeded', 404);
        Audit::log($request, 'viewed_receipt', $p);

        return response()->json([
            'clinic' => config('app.name'),
            'receipt_number' => $p->receipt_number,
            'paid_at' => $p->paid_at,
            'method' => $p->method,
            'amount' => $p->amount,
            'patient' => ['name' => $patient->first_name.' '.$patient->last_name, 'mrn' => $patient->mrn],
            'invoice' => [
                'number' => $p->invoice->invoice_number, 'description' => $p->invoice->description,
                'total' => $p->invoice->amount, 'paid' => $p->invoice->amount_paid, 'balance' => $p->invoice->balance,
                'status' => $p->invoice->status, 'items' => $p->invoice->items,
            ],
        ]);
    }

    /** POST /api/webhooks/stripe — public, authenticated by signature only. */
    public function stripeWebhook(Request $request)
    {
        $secret = config('services.stripe.webhook_secret');
        $payload = $request->getContent();
        abort_unless($secret && self::validSignature($payload, (string) $request->header('Stripe-Signature'), $secret), 400, 'Invalid signature');

        $event = json_decode($payload, true);
        $obj = $event['data']['object'] ?? [];
        $payment = Payment::where('gateway_ref', $obj['id'] ?? '')->first();

        if ($payment && ($event['type'] ?? '') === 'checkout.session.completed' && ($obj['payment_status'] ?? '') === 'paid') {
            DB::transaction(function () use ($payment, $obj) {
                $payment = Payment::whereKey($payment->id)->lockForUpdate()->first();
                if ($payment->status !== 'pending') {
                    return; // idempotent: Stripe retries webhooks
                }
                // refuse mismatched amounts rather than trusting the callback blindly
                if ((int) ($obj['amount_total'] ?? 0) !== (int) round((float) $payment->amount * 100)) {
                    $payment->update(['status' => 'failed', 'notes' => 'Amount mismatch']);

                    return;
                }
                $payment->markSucceeded();
                $invoice = $payment->invoice;
                $invoice->update(['payment_method' => 'stripe']);
                $invoice->recalculate();
                if ($invoice->patient) {
                    Notify::patient($invoice->patient, 'payment_received',
                        "Payment of {$payment->amount} received for {$invoice->invoice_number}. Thank you.", '/portal/billing',
                        "Receipt {$payment->receipt_number}", 'billing');
                }
            });
        } elseif ($payment && ($event['type'] ?? '') === 'checkout.session.expired' && $payment->status === 'pending') {
            $payment->update(['status' => 'failed']);
        }

        return response()->json(['received' => true]);
    }

    /** Stripe-Signature: t=timestamp,v1=hmac_sha256("t.payload") ; 5 minute tolerance. */
    public static function validSignature(string $payload, string $header, string $secret, ?int $now = null): bool
    {
        $parts = [];
        foreach (explode(',', $header) as $kv) {
            [$k, $v] = array_pad(explode('=', $kv, 2), 2, '');
            $parts[$k][] = $v;
        }
        $t = (int) ($parts['t'][0] ?? 0);
        if (! $t || abs(($now ?? time()) - $t) > 300) {
            return false;
        }
        $expected = hash_hmac('sha256', $t.'.'.$payload, $secret);
        foreach ($parts['v1'] ?? [] as $sig) {
            if (hash_equals($expected, $sig)) {
                return true;
            }
        }

        return false;
    }
}
