<?php

namespace App\Notifications;

use App\Notifications\Channels\TwilioSmsChannel;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Generic notification for patients/staff: always in-app (bell), plus email and/or SMS
 * when the patient's notification preferences allow it.
 *
 * @param  string  $pref  which preference toggle gates email/SMS:
 *                        appointment_reminders | messages | billing | (null = always allowed, e.g. confirmations)
 */
class PortalEventNotification extends Notification
{
    public function __construct(
        public string $type,
        public string $message,
        public string $link,
        public ?string $subject = null,
        public ?string $pref = null,
        public array $extra = [],
    ) {}

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        $prefs = $notifiable->patient?->notification_prefs ?? null;

        if ($prefs !== null) {
            $allowed = $this->pref === null || ($prefs[$this->pref] ?? true);
            if ($allowed && ($prefs['email'] ?? true) && $notifiable->email) {
                $channels[] = 'mail';
            }
            if ($allowed && ($prefs['sms'] ?? false) && TwilioSmsChannel::configured() && $notifiable->patient?->phone) {
                $channels[] = TwilioSmsChannel::class;
            }
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subject ?? config('app.name').': '.$this->message)
            ->greeting('Hello '.($notifiable->name ?? ''))
            ->line($this->message)
            ->action('Open patient portal', rtrim((string) config('app.frontend_url', env('FRONTEND_URL', '')), '/').$this->link)
            ->line('You are receiving this because of your notification settings in the patient portal.');
    }

    public function toSms(object $notifiable): array
    {
        return ['to' => $notifiable->patient?->phone, 'body' => config('app.name').': '.$this->message];
    }

    public function toArray(object $notifiable): array
    {
        return ['type' => $this->type, 'message' => $this->message, 'link' => $this->link] + $this->extra;
    }
}
