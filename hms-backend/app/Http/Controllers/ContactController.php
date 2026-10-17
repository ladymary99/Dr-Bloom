<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    // public: contact page form
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:100',
            'email'   => 'required|email|max:150',
            'message' => 'required|string|max:5000',
        ]);

        Contact::create($data);
        return response()->json(['ok' => true], 201);
    }

    // admin only
    public function index(Request $request)
    {
        return Contact::orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));
    }

    public function markRead(Contact $contact)
    {
        $contact->update(['is_read' => true]);
        return response()->json(['ok' => true]);
    }

    public function destroy(Contact $contact)
    {
        $contact->delete();
        return response()->json(['ok' => true]);
    }
}