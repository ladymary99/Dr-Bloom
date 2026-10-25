<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_number', 'patient_id', 'department_id', 'description',
        'amount', 'status', 'payment_method', 'paid_at', 'created_by', 'doctor_id', 'source',
        'amount_paid', 'due_date', 'appointment_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'paid_at' => 'datetime',
        'due_date' => 'date',
    ];

    protected $appends = ['balance'];

    public function getBalanceAttribute(): string
    {
        return number_format(max(0, (float) $this->amount - (float) $this->amount_paid), 2, '.', '');
    }

    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice) {
            // Sequence-backed: concurrent invoice creation can never collide.
            $invoice->invoice_number ??= 'INV-' . now()->format('Y') . '-' .
                str_pad((string) \Illuminate\Support\Facades\DB::scalar("select nextval('invoice_number_seq')"), 4, '0', STR_PAD_LEFT);
        });
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'doctor_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function claims(): HasMany
    {
        return $this->hasMany(InsuranceClaim::class);
    }

    /** Re-derive paid amount + status from the payment ledger (single source of truth). */
    public function recalculate(): void
    {
        if ($this->status === 'cancelled') {
            return;
        }
        $paid = (float) $this->payments()->where('status', 'succeeded')->sum('amount');
        $refunded = $this->payments()->where('status', 'refunded')->exists();
        $total = (float) $this->amount;

        $status = match (true) {
            $paid <= 0 && $refunded => 'refunded',
            $paid <= 0 => 'pending',
            $paid + 0.005 >= $total => 'paid',
            default => 'partial',
        };

        $this->forceFill([
            'amount_paid' => min($paid, $total),
            'status' => $status,
            'paid_at' => $status === 'paid' ? ($this->paid_at ?? now()) : null,
        ])->save();
    }
}
