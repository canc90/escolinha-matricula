<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TurmaResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'turno' => $this->turno,
            'ano_letivo' => $this->ano_letivo,
            'alunos_count' => $this->whenCounted('alunos'),
            'professoras' => ProfessoraResource::collection($this->whenLoaded('professoras')),
            'criado_em' => $this->created_at?->toIso8601String(),
            'atualizado_em' => $this->updated_at?->toIso8601String(),
        ];
    }
}
