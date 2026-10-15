<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('aluno_id')->nullable()->constrained('alunos')->cascadeOnDelete();
            $table->foreignId('turma_id')->nullable()->constrained('turmas')->cascadeOnDelete();
            $table->string('type', 50);
            $table->string('severity', 20);
            $table->text('message');
            $table->json('details')->nullable();
            $table->boolean('resolved')->default(false);
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index('aluno_id');
            $table->index('turma_id');
            $table->index('type');
            $table->index('resolved');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
