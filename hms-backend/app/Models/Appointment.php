<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    use HasUuids;

    protected $fillable = [
        'patient_id', 'doctor_id', 'department_id', 'appointment_at',
        'duration_minutes', 'status', 'reason', 'notes',
    ];

    protected $casts = ['appointment_at' => 'datetime'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'doctor_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function visit(): HasOne
    {
        return $this->hasOne(Visit::class);
    }
}