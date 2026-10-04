<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasTitle = Schema::hasColumn('announcements', 'title');
        $hasBody = Schema::hasColumn('announcements', 'body');
        $hasActive = Schema::hasColumn('announcements', 'is_active');
        $hasCreator = Schema::hasColumn('announcements', 'created_by');

        if ($hasTitle && $hasBody && $hasActive && $hasCreator) {
            return;
        }

        $hasRows = DB::table('announcements')->exists();

        Schema::table('announcements', function (Blueprint $table) use ($hasTitle, $hasBody, $hasActive, $hasCreator, $hasRows): void {
            if (! $hasTitle) {
                $title = $table->string('title');
                if ($hasRows) {
                    $title->nullable();
                }
            }

            if (! $hasBody) {
                $body = $table->text('body');
                if ($hasRows) {
                    $body->nullable();
                }
            }

            if (! $hasActive) {
                $table->boolean('is_active')->default(true);
            }

            if (! $hasCreator) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        // Keep repaired columns in place to avoid discarding announcement data.
    }
};