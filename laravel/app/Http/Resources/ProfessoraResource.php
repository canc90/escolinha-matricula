<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfessoraResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'email' => $this->email,
            'telefone' => $this->telefone,
            'especialidade' => $this->especialidade,
            'rg' => $this->rg,
            'cpf' => $this->cpf,
            'turno' => $this->turno,
            'foto_url' => $this->foto_url,
            'documento_url' => $this->documento_url,
            'turmas' => TurmaResource::collection($this->whenLoaded('turmas')),
            'criado_em' => $this->created_at?->toIso8601String(),
            'atualizado_em' => $this->updated_at?->toIso8601String(),
        ];
    }
}
