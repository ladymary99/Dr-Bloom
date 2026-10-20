<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AppointmentBookedNotification extends Notification
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
            'type'    => 'appointment_booked',
            'message' => $this->message,
            'link'    => method_exists($notifiable, 'hasRole') && $notifiable->hasRole('patient')
                ? '/portal/appointments'
                : '/appointments',
            'appointment_id' => $this->appointmentId,
        ];
    }
}