<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Doctor clinical workflow: encounter lifecycle, queue statuses, break-the-glass access,
 * letters, ICD-10 search, per-day schedules. SQL: database/sql/doctor_workflow.sql (idempotent).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/doctor_workflow.sql')));
        DB::unprepared(file_get_contents(database_path('sql/icd10_common.sql')));
    }

    public function down(): void
    {
        // Non-destructive on purpose (clinical data).
    }
};
