<?php

namespace App\Livewire\Turmas;

use App\Models\Turma;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Turmas')]
class TurmasIndex extends Component
{
    public function excluir(int $id): void
    {
        abort_unless(auth()->user()->isAdmin(), 403);

        $turma = Turma::findOrFail($id);
        $turma->deleted_by = auth()->id();
        $turma->save();
        $turma->delete();

        Audit::log('delete', 'turmas', $id, $turma->toArray());

        session()->flash('status', 'Turma excluída com sucesso.');
    }

    public function render()
    {
        $turmas = Turma::query()
            ->withCount('alunos')
            ->orderBy('nome')
            ->get();

        $totalAlunos = [];
        foreach ($turmas as $turma) {
            $totalAlunos[$turma->id] = $turma->alunos_count;
        }

        $professorasPorTurma = DB::table('turma_professora')
            ->join('professoras', 'turma_professora.professora_id', '=', 'professoras.id')
            ->whereNull('professoras.deleted_at')
            ->select('turma_professora.turma_id', 'professoras.nome')
            ->get()
            ->groupBy('turma_id');

        return view('livewire.turmas.index', compact('turmas', 'totalAlunos', 'professorasPorTurma'));
    }
}
