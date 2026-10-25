<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
    // ── doctor availability + profile extras ──
    if (! Schema::hasColumn('staff_profiles', 'working_days')) {
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->json('working_days')->nullable()->after('is_active');
            $table->json('working_hours')->nullable()->after('working_days');
            $table->unsignedSmallInteger('slot_minutes')->default(30)->after('working_hours');
            $table->text('bio')->nullable()->after('slot_minutes');
            $table->string('languages')->nullable()->after('bio');
            $table->unsignedTinyInteger('years_experience')->nullable()->after('languages');
        });
    }

    // ── appointment tracking ──
    if (! Schema::hasColumn('appointments', 'cancelled_at')) {
        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('reminder_sent_at');
            $table->timestamp('reminder_24h_sent_at')->nullable()->after('cancelled_at');
            $table->timestamp('reminder_1h_sent_at')->nullable()->after('reminder_24h_sent_at');
        });
    }

    // ── generated end-time column (immutable → usable in index) ──
    if (! Schema::hasColumn('appointments', 'ends_at')) {
        DB::statement("ALTER TABLE appointments ADD COLUMN ends_at timestamp
            GENERATED ALWAYS AS (appointment_at + duration_minutes * interval '1 minute') STORED");
    }

    // ── DB-level double-booking guard ──
    // Only active appointments from the go-live date onward are enforced. Rows created
    // before this date (legacy/seed data) may overlap and are intentionally exempt, because
    // an exclusion constraint cannot be added while violating rows exist.
    DB::statement('CREATE EXTENSION IF NOT EXISTS btree_gist');
    DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_double_booking');
    DB::statement("ALTER TABLE appointments ADD CONSTRAINT no_double_booking EXCLUDE USING gist (
        doctor_id WITH =,
        tsrange(appointment_at, ends_at) WITH &&
    ) WHERE (status IN ('scheduled','confirmed','checked_in') AND appointment_at >= timestamp '2026-10-23 00:00:00')");
}

public function down(): void
{
    DB::statement('ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_double_booking');
    DB::statement('ALTER TABLE appointments DROP COLUMN IF EXISTS ends_at');

    Schema::table('appointments', function (Blueprint $table) {
        $table->dropColumn(['cancelled_at', 'reminder_24h_sent_at', 'reminder_1h_sent_at']);
    });

    Schema::table('staff_profiles', function (Blueprint $table) {
        $table->dropColumn(['working_days', 'working_hours', 'slot_minutes', 'bio', 'languages', 'years_experience']);
    });
}
};