<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Visit extends Model
{
    use HasUuids;

    protected $fillable = [
        'patient_id', 'appointment_id', 'doctor_id', 'visited_at',
        'type', 'chief_complaint', 'vitals', 'diagnosis', 'notes',
        'share_diagnosis', 'share_vitals', 'share_notes',
        'status', 'subjective', 'objective', 'assessment', 'plan', 'diagnosis_codes',
        'follow_up_days', 'follow_up_note', 'signed_at', 'signed_by', 'version',
    ];

    protected $casts = [
        'visited_at' => 'datetime',
        'signed_at' => 'datetime',
        'diagnosis_codes' => 'array',
        'version' => 'integer',
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
            'diagnosis' => $this->share_diagnosis ? ($this->diagnosis ?: $this->assessment) : null,
            'diagnosis_codes' => $this->share_diagnosis ? $this->diagnosis_codes : [],
            'follow_up' => $this->follow_up_days ? ['days' => $this->follow_up_days, 'note' => $this->follow_up_note] : null,
            'letters' => $this->relationLoaded('letters') ? $this->letters->map(fn ($l) => ['id' => $l->id, 'type' => $l->type, 'issued_at' => $l->issued_at])->values() : [],
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

    public function isSigned(): bool
    {
        return $this->status === 'signed';
    }

    public function versions(): HasMany
    {
        return $this->hasMany(VisitVersion::class);
    }

    public function addenda(): HasMany
    {
        return $this->hasMany(VisitAddendum::class);
    }

    public function letters(): HasMany
    {
        return $this->hasMany(ClinicalLetter::class);
    }

    public function labTests(): HasMany
    {
        return $this->hasMany(LabTest::class);
    }

    /** The content fields that are versioned and locked on signing. */
    public const NOTE_FIELDS = ['chief_complaint', 'vitals', 'subjective', 'objective', 'assessment', 'plan', 'diagnosis', 'diagnosis_codes', 'notes', 'follow_up_days', 'follow_up_note'];
}
