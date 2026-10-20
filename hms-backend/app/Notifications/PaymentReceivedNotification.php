<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(public string $invoiceNumber, public float $amount) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'    => 'payment',
            'message' => "Payment received: {$this->invoiceNumber} — $" . number_format($this->amount, 2),
            'link'    => '/payments',
        ];
    }
}