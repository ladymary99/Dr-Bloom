<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffProfile extends Model
{
    protected $fillable = [
        'user_id', 'employee_code', 'department_id', 'position',
        'specialization', 'phone', 'hired_at', 'is_active',
        'working_days', 'working_hours', 'slot_minutes', 'bio', 'languages',
        'years_experience', 'consultation_fee',
    ];

    protected $casts = [
        'hired_at' => 'date',
        'is_active' => 'boolean',
        'working_days' => 'array',
        'working_hours' => 'array',
        'slot_minutes' => 'integer',
        'years_experience' => 'integer',
        'consultation_fee' => 'decimal:2',
    ];

    public function timeOff(): HasMany
    {
        return $this->hasMany(DoctorTimeOff::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'doctor_id');
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class, 'doctor_id');
    }
}