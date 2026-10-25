<?php

namespace Tests\Unit;

use App\Support\Booking\CancellationPolicy;
use App\Support\Booking\SlotGenerator;
use App\Support\Calendar\IcsBuilder;
use App\Support\Security\Totp;
use App\Support\Security\UploadInspector;
use DateTimeImmutable as D;
use PHPUnit\Framework\TestCase;

class PortalCoreTest extends TestCase
{
    private array $hours = ['start' => '09:00', 'end' => '12:00', 'break_start' => '10:00', 'break_end' => '10:30'];

    private function gen(array $busy = [], array $off = [], string $now = '2026-10-26 00:00:00', int $lead = 0, array $days = [1, 2, 3, 4, 5]): array
    {
        // 2026-10-26 is a Monday
        return SlotGenerator::generate(new D('2026-10-26'), new D('2026-10-28'), $days, $this->hours, 30, $busy, $off, new D($now), $lead);
    }

    public function test_slots_respect_hours_and_break(): void
    {
        $this->assertSame(['09:00', '09:30', '10:30', '11:00', '11:30'], $this->gen()['2026-10-26']);
    }

    public function test_booked_slot_is_removed(): void
    {
        $s = $this->gen([['2026-10-26 09:30:00', '2026-10-26 10:00:00']]);
        $this->assertSame(['09:00', '10:30', '11:00', '11:30'], $s['2026-10-26']);
    }

    public function test_partially_overlapping_booking_blocks_both_neighbours(): void
    {
        // a 45-minute legacy appointment 10:30-11:15 blocks 10:30 and 11:00
        $s = $this->gen([['2026-10-26 10:30:00', '2026-10-26 11:15:00']]);
        $this->assertSame(['09:00', '09:30', '11:30'], $s['2026-10-26']);
    }

    public function test_days_off_and_non_working_days(): void
    {
        $s = $this->gen([], [['2026-10-27', '2026-10-27']], days: [1, 2, 3]);
        $this->assertArrayHasKey('2026-10-26', $s);
        $this->assertArrayNotHasKey('2026-10-27', $s);
        $this->assertArrayHasKey('2026-10-28', $s);
        $this->assertSame([], $this->gen(days: [6, 7]));
    }

    public function test_past_slots_and_lead_time_are_hidden(): void
    {
        $s = $this->gen([], [], '2026-10-26 09:40:00', 60); // earliest bookable = 10:40
        $this->assertSame(['11:00', '11:30'], $s['2026-10-26']);
    }

    public function test_cancellation_cutoff(): void
    {
        $now = new D('2026-10-26 08:00:00');
        $this->assertTrue(CancellationPolicy::allows(new D('2026-10-26 10:00:00'), $now, 2));   // exactly 2h
        $this->assertFalse(CancellationPolicy::allows(new D('2026-10-26 09:59:00'), $now, 2));  // 1h59
        $this->assertFalse(CancellationPolicy::allows(new D('2026-10-26 07:00:00'), $now, 2));  // past
    }

    public function test_ics_is_valid_and_escaped(): void
    {
        $ics = IcsBuilder::event('abc-123', new D('2026-10-26 09:00'), new D('2026-10-26 09:30'),
            'Visit with Dr. Ahmadi; Cardiology', "Bring reports,\nand ID", 'Dr-Bloom Hospital', null, new D('2026-10-23 12:00:00', new \DateTimeZone('UTC')));
        $this->assertStringContainsString("BEGIN:VCALENDAR\r\n", $ics);
        $this->assertStringContainsString("DTSTART:20261026T090000\r\n", $ics);
        $this->assertStringContainsString('SUMMARY:Visit with Dr. Ahmadi\\; Cardiology', $ics);
        $this->assertStringContainsString('DESCRIPTION:Bring reports\\,\\nand ID', $ics);
        $this->assertStringEndsWith("END:VCALENDAR\r\n", $ics);
        foreach (explode("\r\n", $ics) as $line) {
            $this->assertLessThanOrEqual(75, strlen($line));
        }
        $long = IcsBuilder::event('x', new D('2026-10-26 09:00'), new D('2026-10-26 09:30'), str_repeat('é', 100));
        foreach (explode("\r\n", $long) as $line) {
            $this->assertLessThanOrEqual(75, strlen($line));
        }
    }

    public function test_totp_matches_rfc6238_vectors(): void
    {
        $secret = Totp::base32Encode('12345678901234567890'); // RFC 6238 SHA-1 test key
        $this->assertSame('287082', Totp::code($secret, 59));
        $this->assertSame('081804', Totp::code($secret, 1111111109));
        $this->assertSame('050471', Totp::code($secret, 1111111111));
        $this->assertSame('005924', Totp::code($secret, 1234567890));
        $this->assertTrue(Totp::verify($secret, '287082', 59));
        $this->assertTrue(Totp::verify($secret, '287082', 80));   // one window of drift
        $this->assertFalse(Totp::verify($secret, '287082', 200));
        $this->assertFalse(Totp::verify($secret, '000000', 59));
    }

    private function tmp(string $content): string
    {
        $p = tempnam(sys_get_temp_dir(), 'up');
        file_put_contents($p, $content);

        return $p;
    }

    public function test_upload_inspector_accepts_real_pdf_and_rejects_hostile_files(): void
    {
        $pdf = $this->tmp("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
        $r = UploadInspector::inspect($pdf, 'report.pdf');
        $this->assertSame('pdf', $r['extension']);
        $this->assertSame('unscanned', $r['scan_status']);

        $cases = [
            'php disguised as pdf' => [$this->tmp('<?php system($_GET[1]);'), 'x.pdf'],
            'exe extension' => [$this->tmp('MZ....'), 'x.exe'],
            'double extension' => [$this->tmp("%PDF-1.4\n%%EOF"), 'x.php.pdf'],
            'pdf with javascript' => [$this->tmp("%PDF-1.4\n<< /S /JavaScript /JS (app.alert(1)) >>\n%%EOF"), 'x.pdf'],
            'html as png' => [$this->tmp('<html><script>alert(1)</script></html>'), 'x.png'],
            'empty file' => [$this->tmp(''), 'x.pdf'],
            'svg' => [$this->tmp('<svg onload=alert(1)>'), 'x.svg'],
        ];
        foreach ($cases as $name => [$path, $client]) {
            try {
                UploadInspector::inspect($path, $client);
                $this->fail("Should have rejected: $name");
            } catch (\InvalidArgumentException) {
                $this->addToAssertionCount(1);
            }
        }
        $this->expectException(\InvalidArgumentException::class);
        UploadInspector::inspect($pdf, 'big.pdf', 10); // over size cap
    }

    public function test_stripe_webhook_signature(): void
    {
        $secret = 'whsec_test';
        $payload = '{"type":"checkout.session.completed"}';
        $t = 1_800_000_000;
        $sig = hash_hmac('sha256', $t.'.'.$payload, $secret);
        $v = \App\Http\Controllers\Api\PortalBillingController::class;

        $this->assertTrue($v::validSignature($payload, "t=$t,v1=$sig", $secret, $t + 10));
        $this->assertTrue($v::validSignature($payload, "t=$t,v1=deadbeef,v1=$sig", $secret, $t + 10)); // key rotation
        $this->assertFalse($v::validSignature($payload.' ', "t=$t,v1=$sig", $secret, $t + 10));         // tampered body
        $this->assertFalse($v::validSignature($payload, "t=$t,v1=$sig", 'other', $t + 10));             // wrong secret
        $this->assertFalse($v::validSignature($payload, "t=$t,v1=$sig", $secret, $t + 301));            // replay
        $this->assertFalse($v::validSignature($payload, '', $secret, $t));
    }
}
