<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id', 'mrn', 'first_name', 'last_name', 'date_of_birth', 'gender',
        'phone', 'email', 'address', 'blood_type', 'allergies', 'national_id', 'profile_photo_path',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
        'chronic_conditions', 'current_medications',
        'insurance_provider', 'insurance_policy_number', 'insurance_group_number', 'insurance_expires_on',
        'preferred_language', 'notification_prefs', 'privacy_accepted_at', 'privacy_policy_version',
    ];

    protected $hidden = ['national_id', 'profile_photo_path'];

    protected $casts = [
        'date_of_birth' => 'date',
        'phone' => 'encrypted',
        'national_id' => 'encrypted',
        'emergency_contact_phone' => 'encrypted',
        'insurance_policy_number' => 'encrypted',
        'insurance_expires_on' => 'date',
        'notification_prefs' => 'array',
        'privacy_accepted_at' => 'datetime',
    ];

    // Auto-generate MRN if not provided
// MRN is always generated server-side from a database sequence: unique, never reused.
    protected static function booted(): void
    {
        static::creating(function (Patient $patient) {
            $patient->mrn ??= 'MRN-' . now()->format('Y') . '-' .
                str_pad((string) \Illuminate\Support\Facades\DB::scalar("select nextval('patient_mrn_seq')"), 6, '0', STR_PAD_LEFT);
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function admissions(): HasMany
    {
        return $this->hasMany(Admission::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function getFullNameAttribute(): string
    {
        return $this->first_name . ' ' . $this->last_name;
    }
    public function labTests(): HasMany
    {
        return $this->hasMany(LabTest::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(PatientDocument::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(Vaccination::class);
    }

    public function consents(): HasMany
    {
        return $this->hasMany(Consent::class);
    }

    public function messageThreads(): HasMany
    {
        return $this->hasMany(MessageThread::class);
    }
}
