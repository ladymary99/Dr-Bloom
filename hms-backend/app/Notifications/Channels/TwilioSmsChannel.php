<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Minimal Twilio SMS channel (REST, no SDK). Inactive unless TWILIO_* env vars are set. */
class TwilioSmsChannel
{
    public static function configured(): bool
    {
        return config('services.twilio.sid') && config('services.twilio.token') && config('services.twilio.from');
    }

    public function send(object $notifiable, Notification $notification): void
    {
        if (! self::configured() || ! method_exists($notification, 'toSms')) {
            return;
        }
        $to = $notification->toSms($notifiable)['to'] ?? null;
        $body = $notification->toSms($notifiable)['body'] ?? null;
        if (! $to || ! $body) {
            return;
        }
        try {
            $res = Http::asForm()->timeout(8)
                ->withBasicAuth(config('services.twilio.sid'), config('services.twilio.token'))
                ->post('https://api.twilio.com/2010-04-01/Accounts/'.config('services.twilio.sid').'/Messages.json', [
                    'To' => $to, 'From' => config('services.twilio.from'), 'Body' => mb_substr($body, 0, 320),
                ]);
            if ($res->failed()) {
                Log::warning('Twilio SMS failed', ['status' => $res->status()]);
            }
        } catch (\Throwable $e) {
            Log::warning('Twilio SMS error: '.$e->getMessage());
        }
    }
}
