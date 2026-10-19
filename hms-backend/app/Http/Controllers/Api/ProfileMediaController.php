<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileMediaController extends Controller
{
    public function avatar(Request $request)
    {
        $path = $request->user()->avatar_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return response()->file(Storage::disk('local')->path($path));
    }

    public function updateAvatar(Request $request)
    {
        $data = $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $user = $request->user();
        $path = $data['avatar']->store("avatars/{$user->id}", 'local');
        abort_if(! $path, 500, 'Could not store the profile photo.');

        $oldPath = $user->avatar_path;
        $user->avatar_path = $path;
        $user->save();

        if ($user->patient) {
            $oldPatientPhoto = $user->patient->profile_photo_path;
            $user->patient->profile_photo_path = $path;
            $user->patient->save();
            if ($oldPatientPhoto && $oldPatientPhoto !== $oldPath && $oldPatientPhoto !== $path) {
                Storage::disk('local')->delete($oldPatientPhoto);
            }
        }

        if ($oldPath && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        return response()->json(['message' => 'Profile photo updated.']);
    }
}
