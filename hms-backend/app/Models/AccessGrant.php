<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A reasoned, time-limited "break the glass" access to a patient who is not in the doctor's care. */
class AccessGrant extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'patient_id', 'reason', 'expires_at', 'reviewed_at', 'reviewed_by', 'review_outcome', 'review_note'];

    protected $casts = ['expires_at' => 'datetime', 'reviewed_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class)->withTrashed();
    }
}
