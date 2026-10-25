<?php

namespace App\Services;

use App\Exceptions\SlotUnavailableException;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Patient;
use App\Models\Setting;
use App\Models\StaffProfile;
use App\Models\User;
use App\Support\Booking\CancellationPolicy;
use App\Support\Booking\SlotGenerator;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The single place where booking rules live. Patient portal, reception and doctors all go
 * through here so they obey the same availability, cutoff and double-booking rules.
 * The database exclusion constraint `no_double_booking` is the final safety net.
 */
class BookingService
{
    public const DEFAULT_HOURS = ['start' => '09:00', 'end' => '17:00'];

    public function cutoffHours(): int
    {
        return max(0, (int) Setting::get('cancellation_cutoff_hours', '2'));
    }

    public function windowDays(): int
    {
        return min(180, max(1, (int) Setting::get('booking_window_days', '60')));
    }

    public function fee(StaffProfile $doctor): float
    {
        return (float) ($doctor->consultation_fee ?? Setting::get('consultation_fee', '0'));
    }

    /** @return array<string, list<string>> date => ['09:00', ...] */
    public function availability(StaffProfile $doctor, ?string $from = null, ?string $to = null, ?string $ignoreAppointmentId = null): array
    {
        $now = new DateTimeImmutable('now');
        $start = new DateTimeImmutable($from ?: $now->format('Y-m-d'));
        $max = $now->modify('+'.$this->windowDays().' days');
        $end = new DateTimeImmutable($to ?: $start->modify('+13 days')->format('Y-m-d'));
        if ($end > $max) {
            $end = $max;
        }
        if ($end > $start->modify('+31 days')) {
            $end = $start->modify('+31 days');
        }
        if ($start < $now->setTime(0, 0)) {
            $start = $now->setTime(0, 0);
        }
        if ($end < $start) {
            return [];
        }

        $slot = (int) ($doctor->slot_minutes ?: 30);

        $busy = Appointment::where('doctor_id', $doctor->id)
            ->whereIn('status', [...Appointment::ACTIVE, 'completed'])
            ->when($ignoreAppointmentId, fn ($q) => $q->where('id', '!=', $ignoreAppointmentId))
            ->where('appointment_at', '<', $end->modify('+1 day')->format('Y-m-d'))
            ->where(DB::raw("appointment_at + (duration_minutes * interval '1 minute')"), '>', $start->format('Y-m-d'))
            ->get(['appointment_at', 'duration_minutes'])
            ->map(fn ($a) => [
                $a->appointment_at->format('Y-m-d H:i:s'),
                $a->appointment_at->copy()->addMinutes($a->duration_minutes)->format('Y-m-d H:i:s'),
            ])->all();

        $off = $doctor->timeOff()
            ->where('ends_on', '>=', $start->format('Y-m-d'))->where('starts_on', '<=', $end->format('Y-m-d'))
            ->get()->map(fn ($t) => [$t->starts_on->format('Y-m-d'), $t->ends_on->format('Y-m-d')])->all();

        return SlotGenerator::generate(
            $start, $end,
            $doctor->working_days ?? [1, 2, 3, 4, 5],
            $doctor->working_hours ?: self::DEFAULT_HOURS,
            $slot, $busy, $off, $now, 30, // 30-minute lead time: no booking a slot that starts in 5 minutes
        );
    }

    public function assertBookable(StaffProfile $doctor, CarbonImmutable $start, ?string $ignoreAppointmentId = null): void
    {
        if (! $doctor->is_active || $doctor->position !== 'doctor') {
            throw new SlotUnavailableException('This doctor is not accepting appointments.');
        }
        $day = $start->format('Y-m-d');
        $times = $this->availability($doctor, $day, $day, $ignoreAppointmentId)[$day] ?? [];
        if (! in_array($start->format('H:i'), $times, true)) {
            throw new SlotUnavailableException('That time is no longer available. Please choose another slot.');
        }
    }

    /** Create an appointment + its consultation invoice atomically. */
    public function book(Patient $patient, StaffProfile $doctor, CarbonImmutable $start, string $reason, string $visitType = 'in_person', ?User $by = null): Appointment
    {
        $this->assertBookable($doctor, $start);

        try {
            return DB::transaction(function () use ($patient, $doctor, $start, $reason, $visitType, $by) {
                $appointment = Appointment::create([
                    'patient_id' => $patient->id,
                    'doctor_id' => $doctor->id,
                    'appointment_at' => $start->format('Y-m-d H:i:s'),
                    'duration_minutes' => (int) ($doctor->slot_minutes ?: 30),
                    'status' => 'scheduled',
                    'reason' => $reason,
                    'visit_type' => $visitType,
                    'booked_by' => $by?->id,
                ]);

                if ($visitType === 'online') {
                    $appointment->update(['meeting_url' => $this->meetingUrl($appointment)]);
                }

                $fee = $this->fee($doctor);
                if ($fee > 0) {
                    $invoice = Invoice::create([
                        'patient_id' => $patient->id,
                        'department_id' => $doctor->department_id,
                        'doctor_id' => $doctor->id,
                        'appointment_id' => $appointment->id,
                        'description' => 'Consultation – '.($doctor->user->name ?? 'Doctor'),
                        'amount' => $fee,
                        'status' => 'pending',
                        'source' => 'online',
                        'created_by' => $by?->id,
                        'due_date' => $start->toDateString(),
                    ]);
                    InvoiceItem::create(['invoice_id' => $invoice->id, 'description' => 'Consultation fee', 'quantity' => 1, 'unit_price' => $fee]);
                }

                return $appointment;
            });
        } catch (QueryException $e) {
            throw $this->translate($e);
        }
    }

    public function reschedule(Appointment $appointment, CarbonImmutable $newStart): Appointment
    {
        $this->assertBookable($appointment->doctor, $newStart, $appointment->id);

        try {
            $appointment->update([
                'rescheduled_from' => $appointment->appointment_at,
                'appointment_at' => $newStart->format('Y-m-d H:i:s'),
                'status' => 'scheduled',
                'reminder_24h_sent_at' => null,
                'reminder_1h_sent_at' => null,
            ]);
            Invoice::where('appointment_id', $appointment->id)->update(['due_date' => $newStart->toDateString()]);
        } catch (QueryException $e) {
            throw $this->translate($e);
        }

        return $appointment->fresh();
    }

    public function cancel(Appointment $appointment, User $by, ?string $reason = null): Appointment
    {
        $appointment->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancelled_by' => $by->id,
            'cancellation_reason' => $reason ? Str::limit($reason, 300, '') : null,
        ]);
        // an unpaid consultation invoice for a cancelled visit is void
        Invoice::where('appointment_id', $appointment->id)->where('status', 'pending')->update(['status' => 'cancelled']);

        return $appointment;
    }

    public function patientMayModify(Appointment $appointment): bool
    {
        return in_array($appointment->status, ['scheduled', 'confirmed'], true)
            && CancellationPolicy::allows(
                new DateTimeImmutable($appointment->appointment_at->format('Y-m-d H:i:s')),
                new DateTimeImmutable('now'),
                $this->cutoffHours(),
            );
    }

    public function meetingUrl(Appointment $appointment): ?string
    {
        $base = trim((string) Setting::get('telehealth_base_url', ''));
        $base = $base !== '' ? $base : 'https://meet.jit.si/DrBloom';

        return rtrim($base, '/').'-'.Str::substr(str_replace('-', '', $appointment->id), 0, 16);
    }

    /** Postgres exclusion_violation (23P01) → friendly conflict error. */
    public function translate(QueryException $e): \Throwable
    {
        return ($e->errorInfo[0] ?? null) === '23P01'
            ? new SlotUnavailableException('Someone just booked that time. Please pick another slot.')
            : $e;
    }
}
