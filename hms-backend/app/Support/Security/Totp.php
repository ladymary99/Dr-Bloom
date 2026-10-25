<?php

namespace App\Support\Security;

/** RFC 6238 TOTP (SHA-1, 6 digits, 30s) for optional authenticator-app 2FA. */
final class Totp
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    public static function generateSecret(int $bytes = 20): string
    {
        return self::base32Encode(random_bytes($bytes));
    }

    public static function code(string $secret, ?int $time = null, int $step = 30): string
    {
        $counter = intdiv($time ?? time(), $step);
        $hash = hash_hmac('sha1', pack('J', $counter), self::base32Decode($secret), true);
        $o = ord($hash[19]) & 0xF;
        $bin = ((ord($hash[$o]) & 0x7F) << 24) | (ord($hash[$o + 1]) << 16) | (ord($hash[$o + 2]) << 8) | ord($hash[$o + 3]);

        return str_pad((string) ($bin % 1000000), 6, '0', STR_PAD_LEFT);
    }

    /** Accepts the previous/current/next window to tolerate clock drift. */
    public static function verify(string $secret, string $code, ?int $time = null, int $window = 1): bool
    {
        $code = preg_replace('/\s+/', '', $code);
        $time ??= time();
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals(self::code($secret, $time + $i * 30), $code)) {
                return true;
            }
        }

        return false;
    }

    public static function uri(string $secret, string $account, string $issuer = 'Dr-Bloom'): string
    {
        return 'otpauth://totp/'.rawurlencode("$issuer:$account").'?secret='.$secret.'&issuer='.rawurlencode($issuer).'&digits=6&period=30';
    }

    public static function base32Encode(string $bin): string
    {
        $bits = '';
        foreach (str_split($bin) as $c) {
            $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }

        return $out;
    }

    public static function base32Decode(string $b32): string
    {
        $bits = '';
        foreach (str_split(strtoupper(rtrim($b32, '='))) as $c) {
            $bits .= str_pad(decbin(strpos(self::ALPHABET, $c)), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }

        return $out;
    }
}
