<?php

namespace App\Support;

/**
 * Display-safe person names. Only fixes names typed ALL lower or ALL upper case;
 * anything with mixed case ("McDonald", "van der Berg") is left exactly as entered.
 */
final class NameCase
{
    public static function format(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }
        $name = trim(preg_replace('/\s+/u', ' ', $name));
        if ($name === '' || $name !== mb_strtolower($name) && $name !== mb_strtoupper($name)) {
            return $name;
        }

        $lower = mb_strtolower($name);

        // capitalise after start, space, hyphen or apostrophe
        return preg_replace_callback('/(^|[\s\-\'’])(\p{L})/u', fn ($m) => $m[1].mb_strtoupper($m[2]), $lower);
    }
}
