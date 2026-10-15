<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Professora extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'professoras';

    protected $fillable = [
        'nome', 'email', 'telefone', 'especialidade',
        'turma', 'turno', 'rg', 'cpf',
        'foto', 'foto_documento', 'deleted_by',
    ];

    public function turmas()
    {
        return $this->belongsToMany(Turma::class, 'turma_professora')
            ->withPivot('principal')
            ->withPivot('created_at');
    }

    /**
     * URL pública da foto da professora.
     */
    protected function fotoUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->foto ? Storage::disk('public')->url($this->foto) : null);
    }

    /**
     * URL pública do documento anexado à professora.
     */
    protected function documentoUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->foto_documento ? Storage::disk('public')->url($this->foto_documento) : null);
    }

    public function users()
    {
        return $this->hasMany(User::class, 'professora_id');
    }

    public function diarios()
    {
        return $this->hasMany(DiarioClasse::class, 'professora_id');
    }
}
