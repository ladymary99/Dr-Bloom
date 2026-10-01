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
    Schema::create('prescriptions', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->foreignUuid('visit_id')->constrained('visits')->cascadeOnDelete();
        $table->foreignId('doctor_id')->constrained('staff_profiles')->restrictOnDelete();
        $table->text('notes')->nullable();
        $table->timestamps();
    });

    Schema::create('prescription_items', function (Blueprint $table) {
        $table->id();
        $table->foreignUuid('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
        $table->string('medicine_name');
        $table->string('dosage');                  // e.g. "500mg"
        $table->string('frequency');               // e.g. "1x3" (3 times a day)
        $table->integer('duration_days')->nullable();
        $table->text('instructions')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};
