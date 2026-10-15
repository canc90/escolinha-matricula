<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Frequencia extends Model
{
    use HasFactory;

    protected $table = 'frequencias';

    public const UPDATED_AT = null;

    protected $fillable = ['turma_id', 'aluno_id', 'data', 'presente'];

    protected function casts(): array
    {
        return [
            'data' => 'date',
            'presente' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function turma()
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }

    public function aluno()
    {
        return $this->belongsTo(Aluno::class, 'aluno_id');
    }
}
