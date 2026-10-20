<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Notifications\AppointmentReminderNotification;
use Illuminate\Console\Command;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:remind';
    protected $description = 'Send 2-hour-before appointment reminders to doctor and patient';

    public function handle(): void
    {
        $windowStart = now()->addHours(2)->subMinutes(5);
        $windowEnd   = now()->addHours(2)->addMinutes(5);

        Appointment::with('patient', 'doctor.user')
            ->whereBetween('appointment_at', [$windowStart, $windowEnd])
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->whereNull('reminder_sent_at')
            ->get()
            ->each(function ($appt) {
                $when  = $appt->appointment_at->format('H:i');
                $patientName = $appt->patient ? "{$appt->patient->first_name} {$appt->patient->last_name}" : 'a patient';

                $appt->doctor?->user?->notify(new AppointmentReminderNotification(
                    $appt->id, "Reminder: appointment with {$patientName} at {$when} (in ~2 hours)"
                ));

                // patient user account (portal)
                $appt->patient?->user?->notify(new AppointmentReminderNotification(
                    $appt->id, "Reminder: your appointment with Dr. {$appt->doctor?->user?->name} is at {$when} (in ~2 hours)"
                ));

                $appt->update(['reminder_sent_at' => now()]);
            });

        $this->info('Reminders sent.');
    }
}