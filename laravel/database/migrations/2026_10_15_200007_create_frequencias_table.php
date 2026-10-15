<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('frequencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('turma_id')->constrained('turmas')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('alunos')->cascadeOnDelete();
            $table->date('data');
            $table->boolean('presente')->default(true);
            $table->timestamp('created_at')->nullable();
            $table->unique(['turma_id', 'aluno_id', 'data']);
            $table->index(['turma_id', 'data']);
            $table->index('aluno_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('frequencias');
    }
};
