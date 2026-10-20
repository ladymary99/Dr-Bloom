<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->string('target')->default('all_staff')->after('body');
            $table->timestamp('publish_at')->nullable()->after('target');
            $table->timestamp('expires_at')->nullable()->after('publish_at');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropColumn(['target', 'publish_at', 'expires_at']);
        });
    }
};