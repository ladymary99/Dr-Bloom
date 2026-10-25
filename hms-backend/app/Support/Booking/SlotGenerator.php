<?php

namespace App\Support\Booking;

use DateTimeImmutable;

/**
 * Pure slot engine (no framework, no DB) so it is trivially testable.
 * All times are naive clinic-local wall-clock times.
 */
final class SlotGenerator
{
    /**
     * @param  list<int>  $workingDays  ISO weekdays, 1 = Monday ... 7 = Sunday
     * @param  array{start:string,end:string,break_start?:?string,break_end?:?string}  $hours
     * @param  list<array{0:string,1:string}>  $busy     [start, end] 'Y-m-d H:i:s' of booked appointments
     * @param  list<array{0:string,1:string}>  $timeOff  [from, to] 'Y-m-d' inclusive days off
     * @return array<string, list<string>>  'Y-m-d' => ['09:00', '09:30', ...]  (only days that have free slots)
     */
    public static function generate(
        DateTimeImmutable $from,
        DateTimeImmutable $to,
        array $workingDays,
        array $hours,
        int $slotMinutes,
        array $busy,
        array $timeOff,
        DateTimeImmutable $now,
        int $leadMinutes = 0,
    ): array {
        if ($slotMinutes < 5 || empty($hours['start']) || empty($hours['end'])) {
            return [];
        }

        $earliest = $now->modify("+{$leadMinutes} minutes")->getTimestamp();
        $busyTs = array_map(fn ($b) => [strtotime($b[0]), strtotime($b[1])], $busy);
        $out = [];

        for ($day = $from->setTime(0, 0); $day <= $to; $day = $day->modify('+1 day')) {
            $date = $day->format('Y-m-d');
            if (! in_array((int) $day->format('N'), $workingDays, true) || self::isOff($date, $timeOff)) {
                continue;
            }

            $start = strtotime("$date {$hours['start']}");
            $end = strtotime("$date {$hours['end']}");
            $bs = ! empty($hours['break_start']) ? strtotime("$date {$hours['break_start']}") : null;
            $be = ! empty($hours['break_end']) ? strtotime("$date {$hours['break_end']}") : null;
            $step = $slotMinutes * 60;

            for ($t = $start; $t + $step <= $end; $t += $step) {
                $slotEnd = $t + $step;
                if ($t < $earliest) {
                    continue;
                }
                if ($bs !== null && $be !== null && $t < $be && $slotEnd > $bs) {
                    continue;
                }
                foreach ($busyTs as [$b0, $b1]) {
                    if ($t < $b1 && $slotEnd > $b0) {
                        continue 2;
                    }
                }
                $out[$date][] = date('H:i', $t);
            }
        }

        return $out;
    }

    /** @param list<array{0:string,1:string}> $timeOff */
    private static function isOff(string $date, array $timeOff): bool
    {
        foreach ($timeOff as [$a, $b]) {
            if ($date >= $a && $date <= $b) {
                return true;
            }
        }

        return false;
    }
}
