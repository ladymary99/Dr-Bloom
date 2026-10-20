<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AnnouncementPublishedNotification extends Notification
{
    use Queueable;

    public function __construct(public string $title, public string $target) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'    => 'announcement',
            'message' => "New announcement: {$this->title}",
            'link'    => method_exists($notifiable, 'hasRole') && $notifiable->hasRole('patient')
                ? '/portal'
                : '/dashboard',
            'target'  => $this->target,
        ];
    }
}