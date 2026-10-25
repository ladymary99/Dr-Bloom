<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\MessageThread;
use App\Models\Patient;
use App\Models\User;
use App\Support\Audit;
use App\Support\Notify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Secure patient <-> clinic messaging. One controller, two audiences (patient portal / staff). */
class MessageController extends Controller
{
    // ───────────────────────── helpers ─────────────────────────

    private function isPatient(Request $r): bool
    {
        return $r->user()->hasRole('patient');
    }

    private function myPatient(Request $r): Patient
    {
        abort_if(! $r->user()->patient, 403);

        return $r->user()->patient;
    }

    /** Staff may open a thread if it is addressed to them, or to the general inbox and they work the front desk. */
    private function staffCanAccess(User $u, MessageThread $t): bool
    {
        return $t->staff_user_id === $u->id
            || ($t->staff_user_id === null && ($u->can('manage appointments') || $u->hasRole('admin')));
    }

    private function authorizeThread(Request $r, MessageThread $t): void
    {
        if ($this->isPatient($r)) {
            abort_if($t->patient_id !== $this->myPatient($r)->id, 403);
        } else {
            abort_unless($this->staffCanAccess($r->user(), $t), 403);
        }
    }

    private function summarize(MessageThread $t, int $viewerId): array
    {
        $last = $t->messages->sortByDesc('created_at')->first();

        return [
            'id' => $t->id,
            'subject' => $t->subject,
            'last_message_at' => $t->last_message_at,
            'preview' => $last ? mb_strimwidth($last->body, 0, 90, '…') : '',
            'unread' => $t->messages->whereNull('read_at')->where('sender_id', '!=', $viewerId)->count(),
            'patient' => $t->patient ? ['id' => $t->patient->id, 'name' => $t->patient->first_name.' '.$t->patient->last_name, 'mrn' => $t->patient->mrn] : null,
            'staff' => $t->staff ? ['id' => $t->staff->id, 'name' => $t->staff->name] : null,
        ];
    }

    // ───────────────────────── listing / reading ─────────────────────────

    public function index(Request $request)
    {
        $u = $request->user();
        $q = MessageThread::with('patient:id,mrn,first_name,last_name', 'staff:id,name', 'messages:id,thread_id,sender_id,body,read_at,created_at');

        if ($this->isPatient($request)) {
            $q->where('patient_id', $this->myPatient($request)->id);
        } else {
            $q->where(function ($qq) use ($u) {
                $qq->where('staff_user_id', $u->id);
                if ($u->can('manage appointments') || $u->hasRole('admin')) {
                    $qq->orWhereNull('staff_user_id');
                }
            });
        }

        return $q->orderByDesc('last_message_at')->limit(100)->get()->map(fn ($t) => $this->summarize($t, $u->id));
    }

    public function show(Request $request, MessageThread $thread)
    {
        $this->authorizeThread($request, $thread);
        $u = $request->user();

        $thread->messages()->whereNull('read_at')->where('sender_id', '!=', $u->id)->update(['read_at' => now()]);
        if (! $this->isPatient($request)) {
            Audit::log($request, 'viewed_messages', $thread->patient ?? Patient::class, $thread->patient_id);
        }

        $thread->load('patient:id,mrn,first_name,last_name', 'staff:id,name', 'messages.sender:id,name');

        return response()->json([
            'thread' => $this->summarize($thread, $u->id),
            'messages' => $thread->messages->sortBy('created_at')->values()->map(fn (Message $m) => [
                'id' => $m->id,
                'body' => $m->body,
                'created_at' => $m->created_at,
                'read_at' => $m->read_at,
                'mine' => $m->sender_id === $u->id,
                'sender' => $m->sender?->name,
            ]),
        ]);
    }

    /** Patient: the people they can write to (their own care team). */
    public function careTeam(Request $request)
    {
        $patient = $this->myPatient($request);
        $doctorIds = $patient->appointments()->pluck('doctor_id')
            ->merge($patient->visits()->pluck('doctor_id'))->filter()->unique();

        return \App\Models\StaffProfile::with('user:id,name')->whereIn('id', $doctorIds)->get()
            ->map(fn ($d) => ['user_id' => $d->user_id, 'name' => $d->user?->name, 'specialization' => $d->specialization])
            ->values();
    }

    // ───────────────────────── writing ─────────────────────────

    public function store(Request $request)
    {
        $u = $request->user();
        $rules = ['subject' => 'required|string|min:2|max:160', 'body' => 'required|string|min:1|max:4000'];

        if ($this->isPatient($request)) {
            $data = $request->validate($rules + ['staff_user_id' => 'nullable|integer|exists:users,id']);
            $patient = $this->myPatient($request);

            if ($data['staff_user_id'] ?? null) {
                $allowed = $patient->appointments()->whereHas('doctor', fn ($d) => $d->where('user_id', $data['staff_user_id']))->exists()
                    || $patient->visits()->whereHas('doctor', fn ($d) => $d->where('user_id', $data['staff_user_id']))->exists();
                abort_unless($allowed, 422, 'You can only message doctors you have an appointment or visit with, or the clinic.');
            }
            $staffUserId = $data['staff_user_id'] ?? null;
        } else {
            $data = $request->validate($rules + ['patient_id' => 'required|uuid|exists:patients,id']);
            $patient = Patient::findOrFail($data['patient_id']);
            $staffUserId = $u->id;
            Audit::log($request, 'messaged_patient', $patient);
        }

        $thread = DB::transaction(function () use ($data, $patient, $staffUserId, $u) {
            $thread = MessageThread::create([
                'patient_id' => $patient->id, 'staff_user_id' => $staffUserId,
                'subject' => $data['subject'], 'last_message_at' => now(),
            ]);
            Message::create(['thread_id' => $thread->id, 'sender_id' => $u->id, 'body' => $data['body']]);

            return $thread;
        });

        $this->notifyRecipient($request, $thread, $patient);

        return response()->json($thread->load('patient:id,mrn,first_name,last_name', 'staff:id,name', 'messages'), 201);
    }

    public function reply(Request $request, MessageThread $thread)
    {
        $this->authorizeThread($request, $thread);
        $data = $request->validate(['body' => 'required|string|min:1|max:4000']);

        $msg = DB::transaction(function () use ($thread, $data, $request) {
            $m = Message::create(['thread_id' => $thread->id, 'sender_id' => $request->user()->id, 'body' => $data['body']]);
            $thread->update(['last_message_at' => now()]);
            // a staff member answering a general-inbox thread takes ownership of it
            if (! $this->isPatient($request) && $thread->staff_user_id === null) {
                $thread->update(['staff_user_id' => $request->user()->id]);
            }

            return $m;
        });

        $this->notifyRecipient($request, $thread, $thread->patient);

        return response()->json(['id' => $msg->id, 'body' => $msg->body, 'created_at' => $msg->created_at, 'mine' => true], 201);
    }

    private function notifyRecipient(Request $request, MessageThread $thread, Patient $patient): void
    {
        $fromName = $request->user()->name;
        if ($this->isPatient($request)) {
            $targets = $thread->staff_user_id
                ? collect([User::find($thread->staff_user_id)])
                : User::permission('manage appointments')->get();
            foreach ($targets->filter() as $staff) {
                Notify::user($staff, 'new_message', "New message from {$fromName}: {$thread->subject}", '/messages');
            }
        } else {
            Notify::patient($patient, 'new_message', "New message from {$fromName}: {$thread->subject}",
                '/portal/messages', 'New message from your clinic', 'messages');
        }
    }
}
