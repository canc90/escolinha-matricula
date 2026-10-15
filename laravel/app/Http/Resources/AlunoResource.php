<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlunoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'data_nascimento' => optional($this->data_nascimento)->format('Y-m-d'),
            'genero' => $this->genero,
            'cpf_aluno' => $this->cpf_aluno,
            'turma_id' => $this->turma_id,
            'turma' => $this->whenLoaded('turmaVinculada', fn () => $this->turmaVinculada?->nome),
            'turno' => $this->turno,
            'nome_mae' => $this->nome_mae,
            'contato_mae' => $this->contato_mae,
            'nome_pai' => $this->nome_pai,
            'contato_pai' => $this->contato_pai,
            'email_aluno' => $this->email_aluno,
            'foto_url' => $this->foto_url,
            'documento_url' => $this->documento_url,
            'criado_em' => $this->created_at?->toIso8601String(),
            'atualizado_em' => $this->updated_at?->toIso8601String(),
        ];
    }
}
