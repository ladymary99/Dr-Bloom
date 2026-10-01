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
    Schema::create('visits', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
        $table->foreignUuid('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
        $table->foreignId('doctor_id')->constrained('staff_profiles')->restrictOnDelete();
        $table->dateTime('visited_at');
        $table->enum('type', ['opd', 'ipd', 'emergency'])->default('opd');
        $table->text('chief_complaint')->nullable();
        $table->json('vitals')->nullable();        // {"bp":"120/80","temp":37.1,"pulse":72}
        $table->text('diagnosis')->nullable();
        $table->text('notes')->nullable();
        $table->timestamps();

        $table->index(['patient_id', 'visited_at']);
        $table->index(['doctor_id', 'visited_at']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
