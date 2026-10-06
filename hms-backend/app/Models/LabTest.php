<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabTest extends Model
{
    protected $fillable = [
        'patient_id', 'visit_id', 'doctor_id', 'test_name',
        'status', 'result', 'notes', 'completed_at',
    ];

    protected $casts = ['completed_at' => 'datetime'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'doctor_id');
    }
}