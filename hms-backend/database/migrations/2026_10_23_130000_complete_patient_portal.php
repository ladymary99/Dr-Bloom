<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Patient portal completion: profile, billing ledger, messaging, vaccinations,
 * consents, data requests, lab repair, RLS lock-down for new tables.
 * All SQL lives in database/sql/portal_complete.sql (idempotent, Postgres).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/portal_complete.sql')));
    }

    public function down(): void
    {
        // Intentionally non-destructive: this migration only adds structure and medical data
        // tables. Drop them manually if you really need to roll back.
    }
};
