<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryItem extends Model
{
    protected $fillable = [
        'department_id', 'item_name', 'category', 'quantity',
        'unit', 'min_level', 'unit_price', 'supplier', 'expiry_date',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function isLow(): bool
    {
        return $this->quantity <= $this->min_level;
    }
}