<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_cache', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->json('dados');
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->nullable();
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_cache');
    }
};
