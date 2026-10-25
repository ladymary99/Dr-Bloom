<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_id', 'amount', 'method', 'status', 'gateway_ref', 'receipt_number',
        'paid_at', 'recorded_by', 'notes',
    ];

    protected $casts = ['amount' => 'decimal:2', 'paid_at' => 'datetime'];

    protected $hidden = ['gateway_ref'];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /** Receipt number from a DB sequence; assigned only when a payment actually succeeds. */
    public function markSucceeded(): void
    {
        $this->forceFill([
            'status' => 'succeeded',
            'paid_at' => now(),
            'receipt_number' => $this->receipt_number
                ?? 'RCT-' . now()->format('Y') . '-' . str_pad((string) \Illuminate\Support\Facades\DB::scalar("select nextval('receipt_number_seq')"), 6, '0', STR_PAD_LEFT),
        ])->save();
    }
}
