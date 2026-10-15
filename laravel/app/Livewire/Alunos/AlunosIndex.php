<?php

namespace App\Livewire\Alunos;

use App\Models\Aluno;
use App\Models\Turma;
use App\Support\Audit;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;
use Livewire\WithPagination;

#[Layout('layouts::app')]
#[Title('Alunos')]
class AlunosIndex extends Component
{
    use WithPagination;

    public string $busca = '';

    public ?int $turmaFiltro = null;

    public function updatingBusca(): void
    {
        $this->resetPage();
    }

    public function updatingTurmaFiltro(): void
    {
        $this->resetPage();
    }

    public function excluir(int $id): void
    {
        $aluno = Aluno::findOrFail($id);
        $this->authorizeAdmin();

        $aluno->deleted_by = auth()->id();
        $aluno->save();
        $aluno->delete();

        Audit::log('delete', 'alunos', $aluno->id, $aluno->toArray());

        session()->flash('status', 'Aluno excluído com sucesso.');
    }

    private function authorizeAdmin(): void
    {
        abort_unless(auth()->user()->isAdmin(), 403);
    }

    public function render()
    {
        $alunos = Aluno::query()
            ->with('turmaVinculada')
            ->when($this->busca, fn ($q) => $q->where('nome', 'like', "%{$this->busca}%"))
            ->when($this->turmaFiltro, fn ($q) => $q->where('turma_id', $this->turmaFiltro))
            ->orderBy('nome')
            ->paginate(15);

        $turmas = Turma::orderBy('nome')->get();

        return view('livewire.alunos.index', compact('alunos', 'turmas'));
    }
}
