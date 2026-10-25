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
        'share_diagnosis', 'share_vitals', 'share_notes',
    ];

    protected $casts = [
        'visited_at' => 'datetime',
        'vitals' => 'array',
        'share_diagnosis' => 'boolean',
        'share_vitals' => 'boolean',
        'share_notes' => 'boolean',
    ];

    /** What the patient may see, honouring the doctor's share toggles. */
    public function forPatient(): array
    {
        return [
            'id' => $this->id,
            'visited_at' => $this->visited_at,
            'type' => $this->type,
            'doctor' => $this->doctor?->user?->name,
            'specialization' => $this->doctor?->specialization,
            'chief_complaint' => $this->chief_complaint,
            'diagnosis' => $this->share_diagnosis ? $this->diagnosis : null,
            'vitals' => $this->share_vitals ? $this->vitals : null,
            'notes' => $this->share_notes ? $this->notes : null,
            'hidden' => array_keys(array_filter([
                'diagnosis' => ! $this->share_diagnosis && $this->diagnosis,
                'vitals' => ! $this->share_vitals && $this->vitals,
                'notes' => ! $this->share_notes && $this->notes,
            ])),
            'prescription' => $this->prescription ? [
                'id' => $this->prescription->id,
                'status' => $this->prescription->status,
                'notes' => $this->prescription->notes,
                'items' => $this->prescription->items,
            ] : null,
        ];
    }

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