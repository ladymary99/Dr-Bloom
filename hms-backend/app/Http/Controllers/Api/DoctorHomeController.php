<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admission;
use App\Models\Appointment;
use App\Models\LabTest;
use App\Models\MessageThread;
use App\Models\Visit;
use App\Support\ActivityFeed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** GET /api/doctor/home — a doctor's own work screen: today, tasks, alerts, my numbers, my inpatients. */
class DoctorHomeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $me = $user->staffProfile;
        abort_if(! $me || $me->position !== 'doctor', 403, 'This screen is for doctors.');
        $id = $me->id;

        $today = Appointment::with('patient:id,mrn,first_name,last_name,date_of_birth,gender,allergies', 'visit:id,appointment_id,status')
            ->where('doctor_id', $id)
            ->where('appointment_at', '>=', today())->where('appointment_at', '<', today()->addDay())
            ->orderBy('appointment_at')->get();

        $present = fn (Appointment $a) => [
            'id' => $a->id, 'appointment_at' => $a->appointment_at->format('Y-m-d\TH:i:s'), 'duration_minutes' => $a->duration_minutes,
            'status' => $a->status, 'reason' => $a->reason, 'visit_type' => $a->visit_type, 'meeting_url' => $a->meeting_url,
            'waiting_minutes' => in_array($a->status, ['checked_in', 'waiting'], true) && $a->checked_in_at ? (int) $a->checked_in_at->diffInMinutes(now()) : null,
            'visit_id' => $a->visit?->id, 'is_overdue' => $a->is_overdue,
            'patient' => $a->patient ? [
                'id' => $a->patient->id, 'mrn' => $a->patient->mrn, 'name' => $a->patient->first_name.' '.$a->patient->last_name,
                'age' => $a->patient->date_of_birth?->age, 'gender' => $a->patient->gender, 'allergies' => $a->patient->allergies,
            ] : null,
        ];

        // next patient: someone already waiting beats the clock; otherwise the next unseen booking
        $queue = $today->filter(fn ($a) => in_array($a->status, ['in_consultation', 'waiting', 'checked_in', 'scheduled', 'confirmed'], true));
        $next = $queue->first(fn ($a) => $a->status === 'in_consultation')
            ?? $queue->first(fn ($a) => in_array($a->status, ['waiting', 'checked_in'], true))
            ?? $queue->first(fn ($a) => $a->appointment_at->isFuture() || $a->appointment_at->diffInMinutes(now()) < 30);

        // ───── tasks ─────
        $drafts = Visit::with('patient:id,first_name,last_name')->where('doctor_id', $id)->where('status', 'draft')->orderBy('visited_at')->limit(5)->get();
        $draftCount = Visit::where('doctor_id', $id)->where('status', 'draft')->count();
        $labsPending = LabTest::with('patient:id,first_name,last_name')->where('doctor_id', $id)->where('status', 'completed')->whereNull('reviewed_at')
            ->orderByDesc('is_critical')->orderBy('completed_at')->limit(5)->get();
        $labsPendingCount = LabTest::where('doctor_id', $id)->where('status', 'completed')->whereNull('reviewed_at')->count();
        $unreadThreads = MessageThread::where('staff_user_id', $user->id)->where('status', 'open')
            ->whereHas('messages', fn ($m) => $m->whereNull('read_at')->where('sender_id', '!=', $user->id))->count();
        $overdue = Appointment::where('doctor_id', $id)->whereIn('status', Appointment::ACTIVE)
            ->whereRaw("appointment_at + ((duration_minutes + 60) * interval '1 minute') < ?", [now()->format('Y-m-d H:i:s')])->count();

        // ───── alerts ─────
        $critical = LabTest::with('patient:id,first_name,last_name')->where('doctor_id', $id)->where('is_critical', true)
            ->where('status', 'completed')->whereNull('reviewed_at')->get();
        $waitingLong = $today->filter(fn ($a) => in_array($a->status, ['checked_in', 'waiting'], true) && $a->checked_in_at && $a->checked_in_at->diffInMinutes(now()) >= 30);

        // ───── my numbers ─────
        $monthStart = now()->startOfMonth();
        $since30 = now()->subDays(30);
        $closed = Appointment::where('doctor_id', $id)->where('appointment_at', '>=', $since30)->whereIn('status', ['completed', 'no_show']);
        $closedCount = (clone $closed)->count();
        $noShow = (clone $closed)->where('status', 'no_show')->count();
        $avgMinutes = Appointment::where('doctor_id', $id)->where('status', 'completed')->where('appointment_at', '>=', $since30)
            ->whereNotNull('consultation_started_at')->whereNotNull('completed_at')
            ->selectRaw('avg(extract(epoch from (completed_at - consultation_started_at)) / 60) as m')->value('m');

        // ───── my inpatients ─────
        $inpatients = Admission::with('patient:id,first_name,last_name,date_of_birth', 'bed.ward:id,name')
            ->where('doctor_id', $id)->where('status', 'admitted')->orderBy('admitted_at')->get()
            ->map(fn ($a) => [
                'id' => $a->id, 'patient_id' => $a->patient_id, 'patient' => $a->patient ? $a->patient->first_name.' '.$a->patient->last_name : '—',
                'age' => $a->patient?->date_of_birth?->age, 'ward' => $a->bed?->ward?->name, 'bed' => $a->bed?->bed_number,
                'admitted_at' => $a->admitted_at, 'days' => (int) $a->admitted_at->diffInDays(now()), 'diagnosis' => $a->diagnosis,
            ]);

        return response()->json([
            'doctor' => ['name' => $user->name, 'specialization' => $me->specialization],
            'today' => $today->map($present)->values(),
            'next' => $next ? $present($next) : null,
            'tasks' => [
                'unsigned_notes' => ['count' => $draftCount, 'items' => $drafts->map(fn ($v) => ['id' => $v->id, 'appointment_id' => $v->appointment_id, 'patient' => $v->patient ? $v->patient->first_name.' '.$v->patient->last_name : '—', 'visited_at' => $v->visited_at])],
                'labs_to_review' => ['count' => $labsPendingCount, 'items' => $labsPending->map(fn ($l) => ['id' => $l->id, 'test' => $l->test_name, 'patient_id' => $l->patient_id, 'patient' => $l->patient ? $l->patient->first_name.' '.$l->patient->last_name : '—', 'critical' => $l->is_critical])],
                'unread_messages' => $unreadThreads,
                'overdue_appointments' => $overdue,
            ],
            'alerts' => [
                'critical_labs' => $critical->map(fn ($l) => ['id' => $l->id, 'test' => $l->test_name, 'patient_id' => $l->patient_id, 'patient' => $l->patient ? $l->patient->first_name.' '.$l->patient->last_name : '—']),
                'waiting_long' => $waitingLong->map(fn ($a) => $present($a))->values(),
            ],
            'numbers' => [
                'patients_seen_month' => Visit::where('doctor_id', $id)->where('status', 'signed')->where('visited_at', '>=', $monthStart)->distinct('patient_id')->count('patient_id'),
                'visits_today' => Visit::where('doctor_id', $id)->where('status', 'signed')->where('visited_at', '>=', today())->count(),
                'no_show_rate' => $closedCount >= 5 ? round($noShow / $closedCount * 100) : null,     // null = not enough data yet
                'avg_visit_minutes' => $avgMinutes ? (int) round($avgMinutes) : null,
            ],
            'inpatients' => $inpatients,
            'activity' => ActivityFeed::build($user->id, 6, $user->id),
        ]);
    }
}
