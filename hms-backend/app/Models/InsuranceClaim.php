<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsuranceClaim extends Model
{
    protected $fillable = [
        'invoice_id', 'patient_id', 'provider', 'claim_number', 'amount_claimed',
        'amount_approved', 'status', 'submitted_at', 'resolved_at', 'notes', 'created_by',
    ];

    protected $casts = [
        'amount_claimed' => 'decimal:2',
        'amount_approved' => 'decimal:2',
        'submitted_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
