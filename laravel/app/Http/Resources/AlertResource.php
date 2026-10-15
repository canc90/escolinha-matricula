<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlertResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'severity' => $this->severity,
            'message' => $this->message,
            'details' => $this->details,
            'resolved' => $this->resolved,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'turma' => new TurmaResource($this->whenLoaded('turma')),
            'aluno' => new AlunoResource($this->whenLoaded('aluno')),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
