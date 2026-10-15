<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Aluno extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'alunos';

    protected $fillable = [
        'id_alu', 'nome', 'data_nascimento', 'genero',
        'endereco_rua', 'endereco_bairro', 'endereco_cidade',
        'nome_pai', 'contato_pai', 'nome_mae', 'contato_mae', 'email_aluno',
        'alergia_intolerancia', 'descricao_alergia',
        'usa_medicamento', 'necessita_atencao_medicamento',
        'autorizacao_fotos_redes', 'autorizacao_passeios',
        'aniversario_escola', 'observacoes_aniversario_escola',
        'contato_emergencia_nome', 'contato_emergencia_telefone',
        'responsaveis_retirada',
        'pode_brincar_areia',
        'turma', 'turno', 'turma_id',
        'cpf_aluno', 'cpf_pai', 'cpf_mae',
        'foto', 'foto_documento',
        'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'data_nascimento' => 'date',
            'alergia_intolerancia' => 'boolean',
            'usa_medicamento' => 'boolean',
            'necessita_atencao_medicamento' => 'boolean',
            'autorizacao_fotos_redes' => 'boolean',
            'autorizacao_passeios' => 'boolean',
            'aniversario_escola' => 'boolean',
            'pode_brincar_areia' => 'boolean',
        ];
    }

    public function turmaVinculada()
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }

    /**
     * URL pública da foto do aluno.
     */
    protected function fotoUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->foto ? Storage::disk('public')->url($this->foto) : null);
    }

    /**
     * URL pública do documento anexado ao aluno.
     */
    protected function documentoUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->foto_documento ? Storage::disk('public')->url($this->foto_documento) : null);
    }

    public function frequencias()
    {
        return $this->hasMany(Frequencia::class, 'aluno_id');
    }

    public function alertas()
    {
        return $this->hasMany(Alert::class, 'aluno_id');
    }
}
