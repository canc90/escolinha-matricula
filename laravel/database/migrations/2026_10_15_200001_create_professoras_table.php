<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professoras', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 255);
            $table->string('email', 254)->nullable();
            $table->string('telefone', 50)->nullable();
            $table->string('especialidade', 255)->nullable();
            $table->string('turma', 50)->nullable();
            $table->string('turno', 50)->nullable();
            $table->string('rg', 20)->nullable();
            $table->string('cpf', 14)->nullable();
            $table->string('foto', 255)->nullable();
            $table->string('foto_documento', 255)->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professoras');
    }
};
