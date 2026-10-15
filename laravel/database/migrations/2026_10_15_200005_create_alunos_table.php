<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alunos', function (Blueprint $table) {
            $table->id();
            $table->integer('id_alu')->nullable();
            $table->string('nome', 255)->nullable()->index();
            $table->date('data_nascimento')->nullable()->index();
            $table->string('genero', 50)->nullable();
            $table->string('endereco_rua', 255)->nullable();
            $table->string('endereco_bairro', 255)->nullable();
            $table->string('endereco_cidade', 255)->nullable();
            $table->string('nome_pai', 255)->nullable();
            $table->string('contato_pai', 100)->nullable();
            $table->string('nome_mae', 255)->nullable();
            $table->string('contato_mae', 100)->nullable();
            $table->string('email_aluno', 255)->nullable();
            $table->boolean('alergia_intolerancia')->default(false);
            $table->text('descricao_alergia')->nullable();
            $table->boolean('usa_medicamento')->default(false);
            $table->boolean('necessita_atencao_medicamento')->default(false);
            $table->boolean('autorizacao_fotos_redes')->default(false);
            $table->boolean('autorizacao_passeios')->default(false);
            $table->boolean('aniversario_escola')->default(false);
            $table->text('observacoes_aniversario_escola')->nullable();
            $table->string('contato_emergencia_nome', 255)->nullable();
            $table->string('contato_emergencia_telefone', 100)->nullable();
            $table->text('responsaveis_retirada')->nullable();
            $table->boolean('pode_brincar_areia')->default(false);
            $table->string('turma', 50)->nullable()->index();
            $table->string('turno', 50)->nullable()->index();
            $table->foreignId('turma_id')->nullable()->constrained('turmas')->nullOnDelete();
            $table->string('cpf_aluno', 14)->nullable();
            $table->string('cpf_pai', 14)->nullable();
            $table->string('cpf_mae', 14)->nullable();
            $table->string('foto', 255)->nullable();
            $table->string('foto_documento', 255)->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alunos');
    }
};
