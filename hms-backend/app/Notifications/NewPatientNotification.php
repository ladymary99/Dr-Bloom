<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewPatientNotification extends Notification
{
    use Queueable;

    public function __construct(public string $patientName, public string $mrn) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'    => 'new_patient',
            'message' => "New patient registered: {$this->patientName} ({$this->mrn})",
            'link'    => '/patients',
        ];
    }
}