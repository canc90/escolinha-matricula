<?php

namespace App\Livewire;

use App\Models\Aluno;
use App\Models\Log;
use App\Models\Professora;
use App\Models\Turma;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Painel')]
class Dashboard extends Component
{
    public function render()
    {
        $hoje = now()->toDateString();

        $totalAlunos = Aluno::count();
        $totalProfessoras = Professora::count();
        $totalTurmas = Turma::count();

        $presencasHoje = DB::table('frequencias')
            ->where('data', $hoje)
            ->where('presente', true)
            ->count();

        $totalHoje = DB::table('frequencias')->where('data', $hoje)->count();
        $percentualHoje = $totalHoje > 0 ? round($presencasHoje / $totalHoje * 100) : 0;

        $ultimosLogs = Log::orderByDesc('created_at')->limit(8)->get();

        return view('livewire.dashboard', compact(
            'totalAlunos', 'totalProfessoras', 'totalTurmas',
            'presencasHoje', 'totalHoje', 'percentualHoje', 'ultimosLogs'
        ));
    }
}
