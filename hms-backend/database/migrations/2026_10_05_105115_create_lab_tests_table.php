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
    Schema::create('lab_tests', function (Blueprint $table) {
        $table->id();
        $table->foreignUuid('patient_id')->constrained('patients')->cascadeOnDelete();
        $table->foreignUuid('visit_id')->nullable()->constrained('visits')->nullOnDelete();
        $table->foreignId('doctor_id')->nullable()->constrained('staff_profiles')->nullOnDelete();
        $table->string('test_name');
        $table->enum('status', ['ordered', 'in_progress', 'completed', 'cancelled'])->default('ordered');
        $table->text('result')->nullable();
        $table->text('notes')->nullable();
        $table->timestamp('completed_at')->nullable();
        $table->timestamps();
        $table->index(['status', 'created_at']);
    });
}

public function down(): void
{
    Schema::dropIfExists('lab_tests');
}
};
