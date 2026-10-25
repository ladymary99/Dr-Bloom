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
        'duration_minutes', 'status', 'reason', 'notes', 'visit_type', 'meeting_url',
        'cancelled_at', 'cancelled_by', 'cancellation_reason', 'rescheduled_from', 'booked_by',
        'reminder_24h_sent_at', 'reminder_1h_sent_at',
    ];

    protected $casts = [
        // Wall-clock clinic time, serialized WITHOUT a UTC "Z" so browsers show exactly the booked time.
        'appointment_at' => 'datetime:Y-m-d\TH:i:s',
        'cancelled_at' => 'datetime',
        'rescheduled_from' => 'datetime:Y-m-d\TH:i:s',
        'reminder_24h_sent_at' => 'datetime',
        'reminder_1h_sent_at' => 'datetime',
    ];

    /** Statuses that occupy the doctor's calendar. */
    public const ACTIVE = ['scheduled', 'confirmed', 'checked_in'];

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