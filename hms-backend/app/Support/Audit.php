<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/** One-liner audit trail: who did what to which record, from where. Never throws. */
final class Audit
{
    public static function log(Request $request, string $action, Model|string $subject, mixed $id = null, array $old = [], array $new = []): void
    {
        try {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action' => $action,
                'auditable_type' => is_string($subject) ? $subject : $subject::class,
                'auditable_id' => (string) ($id ?? (is_string($subject) ? null : $subject->getKey())),
                'old_values' => $old ?: null,
                'new_values' => $new ?: null,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
            ]);
        } catch (\Throwable $e) {
            report($e); // auditing must never break the clinical workflow
        }
    }
}
