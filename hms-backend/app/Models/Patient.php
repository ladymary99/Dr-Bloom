<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'mrn', 'first_name', 'last_name', 'date_of_birth', 'gender',
        'phone', 'email', 'address', 'blood_type', 'allergies', 'national_id',
    ];

    protected $hidden = ['national_id'];

    protected $casts = [
        'date_of_birth' => 'date',
        'phone' => 'encrypted',
        'national_id' => 'encrypted',
    ];

    // Auto-generate MRN if not provided
protected static function booted(): void
{
    static::creating(function (Patient $patient) {
        $patient->mrn ??= 'MRN-' . now()->format('Y') . '-' . strtoupper(\Illuminate\Support\Str::random(6));
    });
}
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function getFullNameAttribute(): string
    {
        return $this->first_name . ' ' . $this->last_name;
    }
}