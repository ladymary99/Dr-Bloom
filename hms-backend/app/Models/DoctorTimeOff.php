<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorTimeOff extends Model
{
    protected $table = 'doctor_time_off';

    protected $fillable = ['staff_profile_id', 'starts_on', 'ends_on', 'reason'];

    protected $casts = ['starts_on' => 'date:Y-m-d', 'ends_on' => 'date:Y-m-d'];

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(StaffProfile::class, 'staff_profile_id');
    }
}
