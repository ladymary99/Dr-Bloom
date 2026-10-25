<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\Security\Totp;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Optional authenticator-app 2FA for any account (patients and staff). */
class TwoFactorController extends Controller
{
    public function setup(Request $request)
    {
        $user = $request->user();
        abort_if($user->two_factor_confirmed_at, 422, 'Two-factor authentication is already enabled.');

        $secret = Totp::generateSecret();
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null])->save();

        return response()->json(['secret' => $secret, 'otpauth_uri' => Totp::uri($secret, $user->email, config('app.name', 'Dr-Bloom'))]);
    }

    public function confirm(Request $request)
    {
        $data = $request->validate(['code' => 'required|string|size:6']);
        $user = $request->user();
        abort_if(! $user->two_factor_secret, 422, 'Start setup first.');

        if (! Totp::verify($user->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => ['That code is not valid. Check your authenticator app and try again.']]);
        }
        $user->forceFill(['two_factor_confirmed_at' => now()])->save();
        Audit::log($request, '2fa_enabled', $user);

        return response()->json(['two_factor_enabled' => true]);
    }

    public function disable(Request $request)
    {
        $data = $request->validate(['current_password' => 'required|current_password', 'code' => 'required|string|size:6']);
        $user = $request->user();
        abort_if(! $user->two_factor_confirmed_at, 422, 'Two-factor authentication is not enabled.');

        if (! Totp::verify($user->two_factor_secret, $data['code'])) {
            throw ValidationException::withMessages(['code' => ['That code is not valid.']]);
        }
        $user->forceFill(['two_factor_secret' => null, 'two_factor_confirmed_at' => null])->save();
        Audit::log($request, '2fa_disabled', $user);

        return response()->json(['two_factor_enabled' => false]);
    }
}
