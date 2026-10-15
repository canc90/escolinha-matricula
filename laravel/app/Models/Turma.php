<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Turma extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'turmas';

    protected $fillable = ['nome', 'turno', 'ano_letivo', 'deleted_by'];

    public function alunos()
    {
        return $this->hasMany(Aluno::class, 'turma_id');
    }

    public function professoras()
    {
        return $this->belongsToMany(Professora::class, 'turma_professora')
            ->withPivot('principal')
            ->withPivot('created_at');
    }

    public function diarios()
    {
        return $this->hasMany(DiarioClasse::class, 'turma_id');
    }

    public function frequencias()
    {
        return $this->hasMany(Frequencia::class, 'turma_id');
    }
}
