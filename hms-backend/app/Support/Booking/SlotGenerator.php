<?php

namespace App\Support\Booking;

use DateTimeImmutable;

/**
 * Pure slot engine (no framework, no DB) so it is trivially testable.
 * All times are naive clinic-local wall-clock times.
 *
 * Two schedule shapes are supported:
 *   - legacy: $workingDays + one $hours block (optionally one break_start/break_end)
 *   - weekly: ['1' => ['start'=>'09:00','end'=>'17:00','breaks'=>[['13:00','14:00'], ...]], '6' => null, ...]
 *     (ISO weekday keys; a missing / null day is a day off)
 */
final class SlotGenerator
{
    /**
     * @param  list<int>  $workingDays  ISO weekdays, 1 = Monday ... 7 = Sunday (legacy shape)
     * @param  array<string,mixed>  $hours  legacy shape: start, end, break_start?, break_end?, breaks?
     * @param  list<array{0:string,1:string}>  $busy     [start, end] 'Y-m-d H:i:s' of booked appointments
     * @param  list<array{0:string,1:string}>  $timeOff  [from, to] 'Y-m-d' inclusive days off
     * @param  array<string,array<string,mixed>|null>|null  $weekly  per-weekday schedule (overrides legacy shape)
     * @param  int  $bufferMinutes  gap kept free after every booked appointment
     * @param  int|null  $maxPerDay  stop offering a day once this many appointments are booked
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
        ?array $weekly = null,
        int $bufferMinutes = 0,
        ?int $maxPerDay = null,
    ): array {
        if ($slotMinutes < 5) {
            return [];
        }

        $earliest = $now->modify("+{$leadMinutes} minutes")->getTimestamp();
        $bufferSec = max(0, $bufferMinutes) * 60;
        $busyTs = [];
        $perDay = [];
        foreach ($busy as [$a, $b]) {
            $s = strtotime($a);
            $busyTs[] = [$s, strtotime($b) + $bufferSec];
            $d = date('Y-m-d', $s);
            $perDay[$d] = ($perDay[$d] ?? 0) + 1;
        }

        $out = [];
        for ($day = $from->setTime(0, 0); $day <= $to; $day = $day->modify('+1 day')) {
            $date = $day->format('Y-m-d');
            $iso = (int) $day->format('N');

            $cfg = $weekly !== null
                ? ($weekly[(string) $iso] ?? null)
                : (in_array($iso, $workingDays, true) ? $hours : null);
            if (! $cfg || empty($cfg['start']) || empty($cfg['end']) || self::isOff($date, $timeOff)) {
                continue;
            }
            if ($maxPerDay !== null && $maxPerDay > 0 && ($perDay[$date] ?? 0) >= $maxPerDay) {
                continue;
            }

            $start = strtotime("$date {$cfg['start']}");
            $end = strtotime("$date {$cfg['end']}");
            $breaks = self::breaks($date, $cfg);
            $step = $slotMinutes * 60;

            for ($t = $start; $t + $step <= $end; $t += $step) {
                $slotEnd = $t + $step;
                if ($t < $earliest) {
                    continue;
                }
                foreach ($breaks as [$b0, $b1]) {
                    if ($t < $b1 && $slotEnd > $b0) {
                        continue 2;
                    }
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

    /** @param array<string,mixed> $cfg @return list<array{0:int,1:int}> */
    private static function breaks(string $date, array $cfg): array
    {
        $pairs = $cfg['breaks'] ?? [];
        if (! empty($cfg['break_start']) && ! empty($cfg['break_end'])) {
            $pairs[] = [$cfg['break_start'], $cfg['break_end']];
        }
        $out = [];
        foreach ($pairs as $p) {
            if (! empty($p[0]) && ! empty($p[1])) {
                $out[] = [strtotime("$date {$p[0]}"), strtotime("$date {$p[1]}")];
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
