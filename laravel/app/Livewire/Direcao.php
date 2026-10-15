<?php

namespace App\Livewire;

use Illuminate\Support\Facades\DB;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Direção — Indicadores')]
class Direcao extends Component
{
    public function render()
    {
        $rankingTurmas = DB::table('frequencias')
            ->join('turmas', 'frequencias.turma_id', '=', 'turmas.id')
            ->whereNull('turmas.deleted_at')
            ->groupBy('turmas.id', 'turmas.nome', 'turmas.turno')
            ->select('turmas.nome', 'turmas.turno',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN frequencias.presente = 1 THEN 1 ELSE 0 END) as presentes'))
            ->get()
            ->map(fn ($r) => [
                'nome' => $r->nome,
                'turno' => $r->turno,
                'total' => (int) $r->total,
                'presentes' => (int) $r->presentes,
                'percentual' => $r->total > 0 ? round($r->presentes / $r->total * 100) : 0,
            ])
            ->sortByDesc('percentual')
            ->values();

        $rankingProfessoras = DB::table('diario_classe')
            ->join('professoras', 'diario_classe.professora_id', '=', 'professoras.id')
            ->whereNull('diario_classe.deleted_at')
            ->whereNull('professoras.deleted_at')
            ->groupBy('professoras.id', 'professoras.nome')
            ->select('professoras.nome', DB::raw('COUNT(*) as registros'))
            ->orderByDesc('registros')
            ->limit(10)
            ->get();

        $evolucao = DB::table('frequencias')
            ->groupBy('data')
            ->orderBy('data')
            ->select('data',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'))
            ->limit(60)
            ->get()
            ->map(fn ($r) => [
                'data' => $r->data,
                'percentual' => $r->total > 0 ? round($r->presentes / $r->total * 100) : 0,
            ]);

        $kpis = [
            'totalRegistros' => (int) DB::table('frequencias')->count(),
            'totalPresencas' => (int) DB::table('frequencias')->where('presente', true)->count(),
        ];
        $kpis['percentualGeral'] = $kpis['totalRegistros'] > 0
            ? round($kpis['totalPresencas'] / $kpis['totalRegistros'] * 100)
            : 0;

        return view('livewire.direcao', compact('rankingTurmas', 'rankingProfessoras', 'evolucao', 'kpis'));
    }
}
