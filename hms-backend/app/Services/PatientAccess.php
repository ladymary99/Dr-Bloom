<?php

namespace App\Services;

use App\Models\AccessGrant;
use App\Models\Admission;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * The single rule for "may this staff member open this patient?".
 *
 *  - Doctors (who are not admins) may only open patients they have a care relationship with:
 *    a live (not cancelled / no-show) appointment, a visit, or an admission under their name.
 *  - Anyone else can be let in by "break the glass": a written reason, valid for a few hours,
 *    audited and queued for an administrator to review.
 *  - Admins, nurses and front desk are not restricted here (their screens are role-scoped elsewhere).
 */
final class PatientAccess
{
    public const GLASS_HOURS = 4;

    public static function restricted(User $user): bool
    {
        return $user->hasRole('doctor') && ! $user->hasRole('admin');
    }

    public static function relationship(User $user, string $patientId): bool
    {
        $doctorId = $user->staffProfile?->id;
        if (! $doctorId) {
            return false;
        }

        return Appointment::where('patient_id', $patientId)->where('doctor_id', $doctorId)
                ->whereNotIn('status', ['cancelled', 'no_show'])->exists()
            || Visit::where('patient_id', $patientId)->where('doctor_id', $doctorId)->exists()
            || Admission::where('patient_id', $patientId)->where('doctor_id', $doctorId)->exists();
    }

    public static function activeGrant(User $user, string $patientId): ?AccessGrant
    {
        return AccessGrant::where('user_id', $user->id)->where('patient_id', $patientId)
            ->where('expires_at', '>', now())->latest()->first();
    }

    public static function can(User $user, Patient|string $patient): bool
    {
        if (! self::restricted($user)) {
            return true;
        }
        $id = $patient instanceof Patient ? $patient->id : $patient;

        return self::relationship($user, $id) || self::activeGrant($user, $id) !== null;
    }

    /** True when access exists only because of break-the-glass (used to tag audit entries). */
    public static function viaGlass(User $user, Patient|string $patient): bool
    {
        if (! self::restricted($user)) {
            return false;
        }
        $id = $patient instanceof Patient ? $patient->id : $patient;

        return ! self::relationship($user, $id) && self::activeGrant($user, $id) !== null;
    }

    /** Abort with a 403 the UI can react to (offer break-the-glass). */
    public static function authorize(User $user, Patient|string $patient): void
    {
        if (self::can($user, $patient)) {
            return;
        }
        throw new HttpResponseException(response()->json([
            'message' => 'You do not have a care relationship with this patient.',
            'code' => 'access_restricted',
            'patient_id' => $patient instanceof Patient ? $patient->id : $patient,
        ], 403));
    }

    /** Restrict a Patient query to what this user may open. */
    public static function scope(Builder $query, User $user): Builder
    {
        if (! self::restricted($user)) {
            return $query;
        }
        $doctorId = $user->staffProfile?->id;
        abort_if(! $doctorId, 403, 'No staff profile linked to this doctor account.');

        return $query->where(function (Builder $q) use ($doctorId, $user) {
            $q->whereHas('appointments', fn ($a) => $a->where('doctor_id', $doctorId)->whereNotIn('status', ['cancelled', 'no_show']))
                ->orWhereHas('visits', fn ($v) => $v->where('doctor_id', $doctorId))
                ->orWhereHas('admissions', fn ($a) => $a->where('doctor_id', $doctorId))
                ->orWhereIn('patients.id', AccessGrant::where('user_id', $user->id)->where('expires_at', '>', now())->select('patient_id'));
        });
    }
}
