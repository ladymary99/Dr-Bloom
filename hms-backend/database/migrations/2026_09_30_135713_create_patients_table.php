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
    Schema::create('patients', function (Blueprint $table) {
        $table->uuid('id')->primary();
        $table->string('mrn', 20)->unique();       // Medical Record Number
        $table->string('first_name');
        $table->string('last_name');
        $table->date('date_of_birth');
        $table->enum('gender', ['male', 'female', 'other']);
        $table->string('phone', 20)->nullable();
        $table->string('email')->nullable();
        $table->text('address')->nullable();
        $table->string('blood_type', 5)->nullable();
        $table->text('allergies')->nullable();
        $table->string('national_id')->nullable(); // will be encrypted in the model
        $table->timestamps();
        $table->softDeletes();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
