<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        return InventoryItem::with('department:id,name')
            ->when($request->department_id, fn($q, $v) => $q->where('department_id', $v))
            ->orderBy('item_name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'item_name' => 'required|string|max:150',
            'category' => 'nullable|string|max:50',
            'quantity' => 'integer|min:0',
            'unit' => 'nullable|string|max:20',
            'min_level' => 'integer|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:100',
            'expiry_date' => 'nullable|date',
        ]);

        return response()->json(InventoryItem::create($data), 201);
    }

    public function update(Request $request, InventoryItem $item)
    {
        $data = $request->validate([
            'item_name' => 'sometimes|required|string|max:150',
            'category' => 'nullable|string|max:50',
            'quantity' => 'integer|min:0',
            'unit' => 'nullable|string|max:20',
            'min_level' => 'integer|min:0',
            'unit_price' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:100',
            'expiry_date' => 'nullable|date',
        ]);

        $item->update($data);

        return $item->fresh();
    }

    public function destroy(InventoryItem $item)
    {
        $item->delete();

        return response()->json(['message' => 'Item removed.']);
    }
}