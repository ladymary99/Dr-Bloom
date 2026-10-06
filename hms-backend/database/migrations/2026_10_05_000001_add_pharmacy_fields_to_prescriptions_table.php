<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('prescriptions', 'status')) {
                $table->string('status')->default('pending')->after('notes');
            }

            if (! Schema::hasColumn('prescriptions', 'dispensed_at')) {
                $table->timestamp('dispensed_at')->nullable()->after('status');
            }

            if (! Schema::hasColumn('prescriptions', 'dispensed_by')) {
                $table->foreignId('dispensed_by')->nullable()->after('dispensed_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('prescriptions', function (Blueprint $table) {
            if (Schema::hasColumn('prescriptions', 'dispensed_by')) {
                $table->dropConstrainedForeignId('dispensed_by');
            }

            if (Schema::hasColumn('prescriptions', 'dispensed_at')) {
                $table->dropColumn('dispensed_at');
            }

            if (Schema::hasColumn('prescriptions', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};
