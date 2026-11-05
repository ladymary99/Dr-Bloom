<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitVersion extends Model
{
    protected $fillable = ['visit_id', 'version', 'snapshot', 'edited_by'];

    protected $casts = ['snapshot' => 'array'];

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'edited_by');
    }
}
