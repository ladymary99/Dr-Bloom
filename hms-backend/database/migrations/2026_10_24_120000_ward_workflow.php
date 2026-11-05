<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/ward_workflow.sql')));
    }

    public function down(): void
    {
        // Non-destructive on purpose (clinical data).
    }
};
