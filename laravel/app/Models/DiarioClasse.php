<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiarioClasse extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'diario_classe';

    protected $fillable = [
        'turma_id', 'professora_id', 'data', 'conteudo_aula', 'observacoes', 'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'date',
        ];
    }

    public function turma()
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }

    public function professora()
    {
        return $this->belongsTo(Professora::class, 'professora_id');
    }
}
