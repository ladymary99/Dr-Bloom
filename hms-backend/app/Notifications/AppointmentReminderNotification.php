<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AppointmentReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $appointmentId,
        public string $message,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'    => 'appointment_reminder',
            'message' => $this->message,
            'link'    => method_exists($notifiable, 'hasRole') && $notifiable->hasRole('patient')
                ? '/portal/appointments'
                : '/appointments',
            'appointment_id' => $this->appointmentId,
        ];
    }
}