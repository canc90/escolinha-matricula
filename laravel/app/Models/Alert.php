<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    protected $table = 'alerts';

    public $timestamps = false;

    protected $fillable = [
        'aluno_id', 'turma_id', 'type', 'severity', 'message',
        'details', 'resolved', 'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'resolved' => 'boolean',
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function aluno()
    {
        return $this->belongsTo(Aluno::class, 'aluno_id');
    }

    public function turma()
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }

    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
