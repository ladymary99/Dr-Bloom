<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\LabTest;
use App\Models\Patient;
use App\Models\Visit;

/**
 * Turns raw audit rows ("patient documents viewed Patient") into readable, linked, de-duplicated lines:
 *   "You viewed Ava King's record  ×8".
 * Patient names are resolved only for what is shown, in batches.
 */
final class ActivityFeed
{
    private const VERBS = [
        'viewed' => "viewed %s's record", 'viewed_break_glass' => "opened %s's record by break-the-glass",
        'viewed_history' => "viewed %s's visit history", 'viewed_visit' => 'opened a visit note for %s',
        'visit_started' => 'started a visit with %s', 'visit_signed' => 'signed the visit note for %s',
        'visit_addendum' => 'added an addendum to the visit of %s', 'appointment_booked' => 'booked an appointment for %s',
        'appointment_updated' => 'updated an appointment for %s', 'appointment_cancelled' => 'cancelled an appointment for %s',
        'prescription_written' => 'wrote a prescription for %s', 'viewed_prescription' => "viewed %s's prescription",
        'lab_result_released' => 'released a lab result for %s', 'lab_result_reviewed' => 'reviewed a lab result for %s',
        'lab_result_updated' => 'updated a lab result for %s', 'lab_file_uploaded' => 'attached a lab report for %s',
        'payment_recorded' => 'recorded a payment for %s', 'letter_issued' => 'issued a letter for %s',
        'vaccination_recorded' => 'recorded a vaccination for %s', 'messaged_patient' => 'sent a message to %s',
        'patient_lookup' => 'searched for a patient', 'break_glass' => 'used break-the-glass for %s',
        'created' => 'created %s', 'updated' => 'updated %s', 'deleted' => 'archived %s',
    ];

    /** @return list<array{id:int,message:string,link:?string,at:string,count:int}> */
    public static function build(?int $userId, int $limit = 8, ?int $viewerId = null): array
    {
        $logs = AuditLog::with('user:id,name')
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->latest('id')->limit(80)->get();

        $names = self::patientNames($logs);
        $rows = [];

        foreach ($logs as $log) {
            [$pid, $pname] = $names[$log->id] ?? [null, null];
            $verb = self::VERBS[$log->action] ?? null;
            if (! $verb) {
                continue;   // internal / noisy actions are not shown
            }
            $who = $viewerId !== null && $log->user_id === $viewerId ? 'You' : ($log->user?->name ?? 'Someone');
            $text = str_contains($verb, '%s') ? sprintf($verb, $pname ?? 'a patient') : $verb;
            $message = "{$who} {$text}";
            $link = $pid ? "/patients/{$pid}" : null;

            // collapse consecutive identical lines into one with a counter
            $last = count($rows) - 1;
            if ($last >= 0 && $rows[$last]['message'] === $message) {
                $rows[$last]['count']++;

                continue;
            }
            $rows[] = ['id' => $log->id, 'message' => $message, 'link' => $link, 'at' => $log->created_at?->toIso8601String(), 'count' => 1];
            if (count($rows) >= $limit) {
                break;
            }
        }

        return $rows;
    }

    /** log id => [patient id, "First Last"] for the log rows that point at (or belong to) a patient. */
    private static function patientNames($logs): array
    {
        $byType = $logs->groupBy('auditable_type');
        $patientOf = [];   // log id => patient id

        foreach ($byType as $type => $group) {
            $ids = $group->pluck('auditable_id')->filter()->unique()->all();
            $map = match ($type) {
                Patient::class => array_combine($ids, $ids),
                Visit::class => Visit::whereIn('id', $ids)->pluck('patient_id', 'id')->all(),
                Appointment::class => Appointment::whereIn('id', $ids)->pluck('patient_id', 'id')->all(),
                LabTest::class => LabTest::whereIn('id', array_filter($ids, 'is_numeric'))->pluck('patient_id', 'id')->all(),
                Invoice::class => Invoice::whereIn('id', array_filter($ids, 'is_numeric'))->pluck('patient_id', 'id')->all(),
                default => [],
            };
            foreach ($group as $log) {
                if (isset($map[$log->auditable_id])) {
                    $patientOf[$log->id] = $map[$log->auditable_id];
                }
            }
        }

        $people = Patient::withTrashed()->whereIn('id', array_unique(array_values($patientOf)))->get(['id', 'first_name', 'last_name'])->keyBy('id');

        return collect($patientOf)->map(fn ($pid) => [$pid, isset($people[$pid]) ? $people[$pid]->first_name.' '.$people[$pid]->last_name : null])->all();
    }
}
