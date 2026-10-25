<?php

namespace App\Support\Calendar;

use DateTimeImmutable;

/** RFC 5545 single-event calendar file. Uses floating local time (no TZ shift on import). */
final class IcsBuilder
{
    public static function event(
        string $uid,
        DateTimeImmutable $start,
        DateTimeImmutable $end,
        string $summary,
        string $description = '',
        string $location = '',
        ?string $url = null,
        ?DateTimeImmutable $stamp = null,
    ): string {
        $stamp ??= new DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Dr-Bloom//Patient Portal//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:'.$uid.'@drbloom',
            'DTSTAMP:'.$stamp->setTimezone(new \DateTimeZone('UTC'))->format('Ymd\THis\Z'),
            'DTSTART:'.$start->format('Ymd\THis'),
            'DTEND:'.$end->format('Ymd\THis'),
            'SUMMARY:'.self::esc($summary),
        ];
        if ($description !== '') {
            $lines[] = 'DESCRIPTION:'.self::esc($description);
        }
        if ($location !== '') {
            $lines[] = 'LOCATION:'.self::esc($location);
        }
        if ($url) {
            $lines[] = 'URL:'.$url;
        }
        array_push($lines,
            'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Appointment in 1 hour', 'END:VALARM',
            'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Appointment tomorrow', 'END:VALARM',
            'END:VEVENT', 'END:VCALENDAR');

        return implode("\r\n", array_map([self::class, 'fold'], $lines))."\r\n";
    }

    private static function esc(string $s): string
    {
        return str_replace(["\\", ";", ",", "\r\n", "\n", "\r"], ["\\\\", "\\;", "\\,", "\\n", "\\n", "\\n"], $s);
    }

    /** Fold at 75 octets, never splitting a multibyte character. */
    private static function fold(string $line): string
    {
        if (strlen($line) <= 75) {
            return $line;
        }
        $out = '';
        $chunk = '';
        $limit = 75;
        foreach (mb_str_split($line) as $ch) {
            if (strlen($chunk) + strlen($ch) > $limit) {
                $out .= $chunk."\r\n ";
                $chunk = '';
                $limit = 74;
            }
            $chunk .= $ch;
        }

        return $out.$chunk;
    }
}
