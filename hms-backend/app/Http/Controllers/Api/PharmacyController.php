<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\Invoice;
use App\Models\Prescription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PharmacyController extends Controller
{
    public function prescriptions()
    {
        return Prescription::with([
            'visit.patient:id,first_name,last_name,mrn',
            'doctor.user:id,name',
            'items',
            'dispensedBy:id,name',
        ])
            ->orderByDesc('created_at')
            ->get();
    }

    public function dispense(Request $request, Prescription $prescription)
    {
        if ($prescription->status !== 'pending') {
            return response()->json(['message' => 'This prescription is not pending.'], 422);
        }

        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:prescription_items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $pharmacistId = $request->user()->id;

        DB::transaction(function () use ($prescription, $data, $pharmacistId) {
            foreach ($data['items'] as $line) {
                $item = $prescription->items()->findOrFail($line['id']);
                $inventory = InventoryItem::where('item_name', $item->medicine_name)->first();

                if (! $inventory) {
                    throw new \RuntimeException("Inventory item for {$item->medicine_name} not found.");
                }

                if ($inventory->quantity < $line['quantity']) {
                    throw new \RuntimeException("Not enough stock for {$item->medicine_name}.");
                }

                $inventory->decrement('quantity', $line['quantity']);
            }

            $prescription->update([
                'status' => 'dispensed',
                'dispensed_at' => now(),
                'dispensed_by' => $pharmacistId,
            ]);
        });

        return $prescription->fresh(['items', 'dispensedBy']);
    }

    public function stock()
    {
        return InventoryItem::with('department:id,name')
            ->orderBy('item_name')
            ->get();
    }

    public function sale(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'required|uuid|exists:patients,id',
            'department_id' => 'nullable|exists:departments,id',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:inventory_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
            'description' => 'nullable|string|max:255',
            'source' => 'nullable|string|max:50',
        ]);

        $invoice = DB::transaction(function () use ($data, $request) {
            $items = [];
            $total = 0;

            foreach ($data['items'] as $line) {
                $inventory = InventoryItem::lockForUpdate()->findOrFail($line['item_id']);

                if ($inventory->quantity < $line['quantity']) {
                    throw new \RuntimeException("Not enough stock for {$inventory->item_name}.");
                }

                $unitPrice = (float) ($line['unit_price'] ?? $inventory->unit_price ?? 0);
                $itemTotal = $unitPrice * (int) $line['quantity'];
                $total += $itemTotal;

                $inventory->quantity -= (int) $line['quantity'];
                $inventory->save();

                $items[] = ['item_id' => $inventory->id, 'quantity' => $line['quantity'], 'unit_price' => $unitPrice];
            }

            $departmentId = $data['department_id'] ?? InventoryItem::find($data['items'][0]['item_id'])?->department_id;

            return Invoice::create([
                'patient_id' => $data['patient_id'],
                'department_id' => $departmentId,
                'description' => $data['description'] ?? 'Pharmacy direct sale',
                'amount' => $total,
                'status' => 'paid',
                'payment_method' => $data['payment_method'] ?? 'cash',
                'created_by' => $request->user()->id,
                'source' => $data['source'] ?? 'pharmacy',
                'doctor_id' => null,
            ]);
        });

        return response()->json([
            'message' => 'Sale completed.',
            'invoice' => $invoice,
        ], 201);
    }
}
