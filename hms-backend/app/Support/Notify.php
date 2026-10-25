<?php

namespace App\Support;

use App\Models\Patient;
use App\Models\User;
use App\Notifications\PortalEventNotification;

/** Fire-and-forget notifications. A mail/SMS outage must never fail a booking or payment. */
final class Notify
{
    public static function user(?User $user, string $type, string $message, string $link, ?string $subject = null, ?string $pref = null, array $extra = []): void
    {
        if (! $user) {
            return;
        }
        try {
            $user->notify(new PortalEventNotification($type, $message, $link, $subject, $pref, $extra));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    public static function patient(Patient $patient, string $type, string $message, string $link, ?string $subject = null, ?string $pref = null, array $extra = []): void
    {
        self::user($patient->user, $type, $message, $link, $subject, $pref, $extra);
    }
}
