<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientDocument extends Model
{
    use HasUuids;

    protected $fillable = [
        'patient_id', 'uploaded_by', 'title', 'original_name', 'file_path', 'mime_type', 'size',
        'category', 'scan_status', 'scanned_at', 'sha256',
    ];

    protected $hidden = ['file_path', 'sha256'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
