<?php

namespace App\Livewire\Alunos;

use App\Models\Aluno;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Ficha do aluno')]
class AlunoShow extends Component
{
    public Aluno $aluno;

    public function mount(Aluno $aluno): void
    {
        $this->aluno = $aluno->load('turmaVinculada');
    }

    public function render()
    {
        $frequencias = $this->aluno->frequencias()
            ->orderByDesc('data')
            ->limit(30)
            ->get();

        $total = $frequencias->count();
        $presentes = $frequencias->where('presente', true)->count();
        $percentual = $total > 0 ? round($presentes / $total * 100) : 0;

        return view('livewire.alunos.show', compact('frequencias', 'total', 'presentes', 'percentual'));
    }
}
