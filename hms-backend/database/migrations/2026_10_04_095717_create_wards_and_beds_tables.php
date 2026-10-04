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
    Schema::create('wards', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code', 10)->unique();
        $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
        $table->timestamps();
    });

    Schema::create('beds', function (Blueprint $table) {
        $table->id();
        $table->foreignId('ward_id')->constrained()->cascadeOnDelete();
        $table->string('bed_number', 10);
        $table->enum('status', ['available', 'occupied', 'maintenance'])->default('available');
        $table->timestamps();
        $table->unique(['ward_id', 'bed_number']);
    });

    Schema::create('admissions', function (Blueprint $table) {
        $table->id();
        $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
        $table->foreignId('bed_id')->constrained()->cascadeOnDelete();
        $table->foreignId('doctor_id')->nullable()->constrained('staff_profiles')->nullOnDelete();
        $table->timestamp('admitted_at');
        $table->timestamp('discharged_at')->nullable();
        $table->enum('status', ['admitted', 'discharged'])->default('admitted');
        $table->text('diagnosis')->nullable();
        $table->text('notes')->nullable();
        $table->timestamps();
    });
}

public function down(): void
{
    Schema::dropIfExists('admissions');
    Schema::dropIfExists('beds');
    Schema::dropIfExists('wards');
}
};
