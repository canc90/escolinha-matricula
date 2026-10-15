<?php

namespace App\Livewire;

use App\Models\Turma;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Painel Pedagógico')]
class DashboardPedagogico extends Component
{
    public function render()
    {
        $turmas = Turma::withCount('alunos')->orderBy('nome')->get();

        $presencaPorTurma = DB::table('frequencias')
            ->groupBy('turma_id')
            ->select('turma_id',
                DB::raw('COUNT(*) as total'),
                DB::raw('SUM(CASE WHEN presente = 1 THEN 1 ELSE 0 END) as presentes'))
            ->get()
            ->keyBy('turma_id');

        $turmasInfo = $turmas->map(function ($turma) use ($presencaPorTurma) {
            $stat = $presencaPorTurma[$turma->id] ?? null;
            $total = $stat->total ?? 0;
            $presentes = $stat->presentes ?? 0;

            return [
                'turma' => $turma,
                'alunos' => $turma->alunos_count,
                'percentual' => $total > 0 ? round($presentes / $total * 100) : null,
            ];
        });

        return view('livewire.dashboard-pedagogico', compact('turmasInfo'));
    }
}
