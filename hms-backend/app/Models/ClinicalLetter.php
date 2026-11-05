<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicalLetter extends Model
{
    use HasUuids;

    protected $fillable = ['visit_id', 'patient_id', 'doctor_id', 'type', 'data', 'issued_at'];

    protected $casts = ['data' => 'array', 'issued_at' => 'datetime'];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'doctor_id');
    }
}
