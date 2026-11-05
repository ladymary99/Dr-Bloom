<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Bed extends Model
{
    protected $fillable = ['ward_id', 'bed_number', 'status', 'cleaning_status', 'is_isolation'];

    protected $casts = ['is_isolation' => 'boolean'];

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function currentAdmission(): HasOne
    {
        return $this->hasOne(Admission::class)->where('status', 'admitted');
    }
}