<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Consent extends Model
{
    protected $fillable = ['patient_id', 'user_id', 'type', 'version', 'accepted_at', 'ip_address', 'user_agent'];

    protected $casts = ['accepted_at' => 'datetime'];
}
