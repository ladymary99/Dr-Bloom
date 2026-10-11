<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->index('appointment_at', 'appointments_appointment_at_index');
            $table->index(['status', 'appointment_at'], 'appointments_status_appointment_at_index');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->index('created_at', 'patients_created_at_index');
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->index('visited_at', 'visits_visited_at_index');
        });

        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->index(['position', 'is_active'], 'staff_profiles_position_is_active_index');
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->index('is_active', 'departments_is_active_index');
        });

        Schema::table('beds', function (Blueprint $table) {
            $table->index('status', 'beds_status_index');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index('created_at', 'audit_logs_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_created_at_index');
        });

        Schema::table('beds', function (Blueprint $table) {
            $table->dropIndex('beds_status_index');
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->dropIndex('departments_is_active_index');
        });

        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->dropIndex('staff_profiles_position_is_active_index');
        });

        Schema::table('visits', function (Blueprint $table) {
            $table->dropIndex('visits_visited_at_index');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex('patients_created_at_index');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('appointments_status_appointment_at_index');
            $table->dropIndex('appointments_appointment_at_index');
        });
    }
};
