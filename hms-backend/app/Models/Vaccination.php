<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vaccination extends Model
{
    use HasUuids;

    protected $fillable = [
        'patient_id', 'vaccine_name', 'dose_number', 'administered_on', 'next_due_on',
        'lot_number', 'administered_by', 'notes',
    ];

    protected $casts = ['administered_on' => 'date:Y-m-d', 'next_due_on' => 'date:Y-m-d'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function administrator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administered_by');
    }
}
