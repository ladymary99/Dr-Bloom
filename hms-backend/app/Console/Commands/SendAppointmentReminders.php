<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Notifications\AppointmentReminderNotification;
use App\Support\Notify;
use Illuminate\Console\Command;

class SendAppointmentReminders extends Command
{
    protected $signature = 'appointments:remind';
    protected $description = 'Send 24-hour and 1-hour appointment reminders (patient: in-app + email/SMS per preferences; doctor: in-app at 1h)';

    public function handle(): int
    {
        $sent24 = $this->send24h();
        $sent1 = $this->send1h();
        $this->info("Reminders sent: {$sent24} (24h), {$sent1} (1h).");

        return self::SUCCESS;
    }

    /**
     * Anything starting within the next 24h (but later than 1h from now) that has not had its
     * day-before reminder yet. Using a range instead of a narrow window means a missed scheduler
     * run never loses a reminder. Bookings made less than 24h ahead are skipped (they already
     * got a confirmation seconds ago).
     */
    private function send24h(): int
    {
        $n = 0;
        Appointment::with('patient.user', 'doctor.user')
            ->whereBetween('appointment_at', [now()->addHour(), now()->addHours(24)])
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->whereNull('reminder_24h_sent_at')
            ->whereRaw("created_at <= appointment_at - interval '24 hours'")
            ->get()->each(function (Appointment $a) use (&$n) {
                // claim the reminder first so an overlapping scheduler run cannot double-send
                if (! Appointment::whereKey($a->id)->whereNull('reminder_24h_sent_at')->update(['reminder_24h_sent_at' => now()])) {
                    return;
                }
                if ($a->patient) {
                    Notify::patient($a->patient, 'appointment_reminder',
                        "Reminder: your appointment with Dr. {$a->doctor?->user?->name} is tomorrow at {$a->appointment_at->format('H:i')}.".$this->joinHint($a),
                        '/portal/appointments', 'Appointment reminder: tomorrow '.$a->appointment_at->format('H:i'), 'appointment_reminders');
                }
                $n++;
            });

        return $n;
    }

    private function send1h(): int
    {
        $n = 0;
        Appointment::with('patient.user', 'doctor.user')
            ->whereBetween('appointment_at', [now(), now()->addHour()])
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->whereNull('reminder_1h_sent_at')
            ->get()->each(function (Appointment $a) use (&$n) {
                if (! Appointment::whereKey($a->id)->whereNull('reminder_1h_sent_at')->update(['reminder_1h_sent_at' => now()])) {
                    return;
                }
                $time = $a->appointment_at->format('H:i');
                $name = $a->patient ? "{$a->patient->first_name} {$a->patient->last_name}" : 'a patient';

                $a->doctor?->user?->notify(new AppointmentReminderNotification($a->id, "Reminder: appointment with {$name} at {$time} (within the hour)"));
                if ($a->patient) {
                    Notify::patient($a->patient, 'appointment_reminder',
                        "Your appointment with Dr. {$a->doctor?->user?->name} starts at {$time}.".$this->joinHint($a),
                        '/portal/appointments', "Appointment at {$time}", 'appointment_reminders');
                }
                $n++;
            });

        return $n;
    }

    private function joinHint(Appointment $a): string
    {
        return $a->visit_type === 'online' && $a->meeting_url ? " Join the video visit: {$a->meeting_url}" : '';
    }
}
