<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aluno;
use App\Models\Professora;
use App\Models\Turma;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Indicadores gerais exibidos no painel.
     *
     * @return array<string, int>
     */
    public function __invoke(): array
    {
        $hoje = now()->toDateString();

        $presencasHoje = DB::table('frequencias')
            ->where('data', $hoje)
            ->where('presente', true)
            ->count();

        $totalHoje = DB::table('frequencias')->where('data', $hoje)->count();

        return [
            'total_alunos' => Aluno::count(),
            'total_professoras' => Professora::count(),
            'total_turmas' => Turma::count(),
            'presencas_hoje' => $presencasHoje,
            'registros_hoje' => $totalHoje,
            'percentual_hoje' => $totalHoje > 0 ? (int) round($presencasHoje / $totalHoje * 100) : 0,
        ];
    }
}
