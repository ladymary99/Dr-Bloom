<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    // All staff: active announcements for the banner
    public function index()
    {
        return Announcement::where('is_active', true)
            ->latest()
            ->limit(5)
            ->get(['id', 'title', 'body', 'created_at']);
    }

    // Admin: all announcements
    public function adminIndex()
    {
        return Announcement::with('creator:id,name')
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:150',
            'body' => 'required|string|max:1000',
        ]);

        return response()->json(
            Announcement::create([...$data, 'created_by' => $request->user()->id]),
            201
        );
    }

    public function update(Request $request, Announcement $announcement)
    {
        $data = $request->validate([
            'title' => 'sometimes|required|string|max:150',
            'body' => 'sometimes|required|string|max:1000',
            'is_active' => 'sometimes|boolean',
        ]);

        $announcement->update($data);

        return $announcement->fresh();
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }
}