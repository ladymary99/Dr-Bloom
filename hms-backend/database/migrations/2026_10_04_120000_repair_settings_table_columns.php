<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $hasKey = Schema::hasColumn('settings', 'key');
        $hasValue = Schema::hasColumn('settings', 'value');

        if ($hasKey && $hasValue) {
            return;
        }

        $hasRows = DB::table('settings')->exists();

        Schema::table('settings', function (Blueprint $table) use ($hasKey, $hasValue, $hasRows): void {
            if (! $hasKey) {
                $key = $table->string('key');
                if ($hasRows) {
                    $key->nullable();
                }
                $key->unique();
            }

            if (! $hasValue) {
                $table->text('value')->nullable();
            }
        });
    }

    public function down(): void
    {
        // Keep repaired columns in place so rolling back cannot discard settings data.
    }
};