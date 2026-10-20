<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Announcement extends Model
{
    protected $fillable = [
        'title', 'body', 'is_active', 'created_by',
        'target', 'publish_at', 'expires_at',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'publish_at'  => 'datetime',
        'expires_at'  => 'datetime',
    ];

    public const TARGETS = ['all_staff', 'doctors', 'patients', 'everyone'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /* ---------- helpers for the admin list ---------- */

    public function getStatusAttribute(): string
    {
        if ($this->publish_at && $this->publish_at->isFuture()) return 'scheduled';
        if ($this->expires_at && $this->expires_at->isPast())    return 'expired';
        return $this->is_active ? 'live' : 'hidden';
    }
}