<?php

namespace App\Livewire;

use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Painel da Professora')]
class DashboardProfessora extends Component
{
    public function render()
    {
        $professora = auth()->user()->professora;
        $turmas = $professora ? $professora->turmas()->orderBy('nome')->get() : collect();

        $totalAlunos = $turmas->sum(fn ($t) => $t->alunos()->count());

        return view('livewire.dashboard-professora', compact('professora', 'turmas', 'totalAlunos'));
    }
}
