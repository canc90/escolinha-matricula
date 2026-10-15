<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('turma_professora', function (Blueprint $table) {
            $table->id();
            $table->foreignId('turma_id')->constrained('turmas')->cascadeOnDelete();
            $table->foreignId('professora_id')->constrained('professoras')->cascadeOnDelete();
            $table->boolean('principal')->default(false);
            $table->timestamp('created_at')->nullable();
            $table->unique(['turma_id', 'professora_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turma_professora');
    }
};
