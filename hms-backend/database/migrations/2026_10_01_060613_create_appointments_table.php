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
    Schema::create('appointments', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
        $table->foreignId('doctor_id')->constrained('staff_profiles')->restrictOnDelete();
        $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
        $table->dateTime('appointment_at');
        $table->integer('duration_minutes')->default(30);
        $table->enum('status', [
            'scheduled', 'confirmed', 'checked_in',
            'completed', 'cancelled', 'no_show',
        ])->default('scheduled');
        $table->text('reason')->nullable();
        $table->text('notes')->nullable();
        $table->timestamps();

        // Fast lookups: "doctor's day" and "patient's history"
        $table->index(['doctor_id', 'appointment_at']);
        $table->index(['patient_id', 'appointment_at']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
