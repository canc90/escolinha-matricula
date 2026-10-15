<?php

namespace App\Services;

use App\Models\Aluno;
use App\Models\Alert;
use App\Models\Turma;
use Illuminate\Support\Facades\DB;

class RiskEngine
{
    /**
     * Calcula o risco de uma turma a partir do percentual de presença.
     */
    public function riscoTurma(int $turmaId): array
    {
        $stats = DB::table('frequencias')
            ->where('turma_id', $turmaId)
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes')
            )
            ->first();

        $total = (int) ($stats->total ?? 0);
        $presentes = (int) ($stats->presentes ?? 0);
        $percentual = $total > 0 ? round($presentes / $total * 100) : null;

        return [
            'turma_id' => $turmaId,
            'total' => $total,
            'presentes' => $presentes,
            'faltas' => $total - $presentes,
            'percentual' => $percentual,
            'nivel' => $this->nivel($percentual),
        ];
    }

    public function riscoAluno(int $alunoId): array
    {
        $stats = DB::table('frequencias')
            ->where('aluno_id', $alunoId)
            ->select(
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes')
            )
            ->first();

        $total = (int) ($stats->total ?? 0);
        $presentes = (int) ($stats->presentes ?? 0);
        $percentual = $total > 0 ? round($presentes / $total * 100) : null;

        return [
            'aluno_id' => $alunoId,
            'total' => $total,
            'presentes' => $presentes,
            'faltas' => $total - $presentes,
            'percentual' => $percentual,
            'nivel' => $this->nivel($percentual),
        ];
    }

    public function nivel(?int $percentual): string
    {
        if ($percentual === null) {
            return 'SEM_DADOS';
        }

        return match (true) {
            $percentual >= 90 => 'BAIXO',
            $percentual >= 75 => 'MEDIO',
            $percentual >= 60 => 'ALTO',
            default => 'CRITICO',
        };
    }

    /**
     * Gera alertas automáticos para turmas com risco alto/crítico.
     */
    public function gerarAlertas(): int
    {
        $gerados = 0;

        foreach (Turma::pluck('id') as $turmaId) {
            $risco = $this->riscoTurma($turmaId);
            $percentual = $risco['percentual'];

            if ($percentual !== null && $percentual < 75) {
                $jaExiste = Alert::where('turma_id', $turmaId)
                    ->where('type', 'LOW_ATTENDANCE')
                    ->where('resolved', false)
                    ->exists();

                if (! $jaExiste) {
                    Alert::create([
                        'turma_id' => $turmaId,
                        'type' => 'LOW_ATTENDANCE',
                        'severity' => $risco['nivel'] === 'CRITICO' ? 'CRITICAL' : 'HIGH',
                        'message' => "Frequência baixa na turma (ID {$turmaId}): {$percentual}% de presença.",
                        'details' => $risco,
                        'created_at' => now(),
                    ]);
                    $gerados++;
                }
            }
        }

        return $gerados;
    }
}
