<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Visit extends Model
{
    use HasUuids;

    protected $fillable = [
        'patient_id', 'appointment_id', 'doctor_id', 'visited_at',
        'type', 'chief_complaint', 'vitals', 'diagnosis', 'notes',
    ];

    protected $casts = [
        'visited_at' => 'datetime',
        'vitals' => 'array',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'doctor_id');
    }

    public function prescription(): HasOne
    {
        return $this->hasOne(Prescription::class);
    }
}