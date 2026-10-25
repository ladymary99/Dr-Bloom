<?php

namespace App\Support\Booking;

use DateTimeImmutable;

final class CancellationPolicy
{
    /** Patients may cancel/reschedule only if the visit is at least $cutoffHours away. */
    public static function allows(DateTimeImmutable $appointmentAt, DateTimeImmutable $now, int $cutoffHours): bool
    {
        return $appointmentAt->getTimestamp() - $now->getTimestamp() >= $cutoffHours * 3600;
    }
}
