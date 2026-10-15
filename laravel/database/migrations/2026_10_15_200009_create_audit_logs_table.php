<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('role', 50)->nullable();
            $table->string('action', 50);
            $table->string('entity', 100)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('payload_before')->nullable();
            $table->json('payload_after')->nullable();
            $table->string('ip_address', 50)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['entity', 'entity_id']);
            $table->index('user_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
