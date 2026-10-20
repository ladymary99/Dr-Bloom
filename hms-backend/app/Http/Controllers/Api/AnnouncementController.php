<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\User;
use App\Notifications\AnnouncementPublishedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class AnnouncementController extends Controller
{
    // All staff: active announcements for the banner
    public function index(Request $request)
    {
        $user = $request->user();
        $targets = $user->hasRole('admin')
            ? Announcement::TARGETS
            : ($user->hasRole('patient')
                ? ['patients', 'everyone']
                : array_merge(['all_staff', 'everyone'], $user->hasRole('doctor') ? ['doctors'] : []));

        return $this->publishedAnnouncements($targets);
    }

    public function portal(Request $request)
    {
        abort_unless($request->user()->hasRole('patient'), 403);

        return $this->publishedAnnouncements(['patients', 'everyone']);
    }

    private function publishedAnnouncements(array $targets)
    {
        return Announcement::query()
            ->where('is_active', true)
            ->whereIn('target', $targets)
            ->where(fn ($query) => $query->whereNull('publish_at')->orWhere('publish_at', '<=', now()))
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>=', now()))
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
            'target' => 'required|in:' . implode(',', Announcement::TARGETS),
            'publish_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:publish_at',
        ]);

        $announcement = Announcement::create([...$data, 'created_by' => $request->user()->id]);

        $isImmediate = ! $announcement->publish_at || $announcement->publish_at->isPast();
        if ($isImmediate) {
            $roles = match ($announcement->target) {
                'doctors' => ['doctor'],
                'patients' => ['patient'],
                'everyone' => null,
                default => ['doctor', 'nurse', 'receptionist'],
            };

            $users = $roles ? User::role($roles)->get() : User::all();
            Notification::send(
                $users,
                new AnnouncementPublishedNotification($announcement->title, $announcement->target)
            );
        }

        return response()->json($announcement, 201);
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