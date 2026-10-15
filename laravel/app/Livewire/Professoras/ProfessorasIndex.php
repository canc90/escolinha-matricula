<?php

namespace App\Livewire\Professoras;

use App\Models\Professora;
use App\Support\Audit;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;
use Livewire\WithPagination;

#[Layout('layouts::app')]
#[Title('Professoras')]
class ProfessorasIndex extends Component
{
    use WithPagination;

    public string $busca = '';

    public function updatingBusca(): void
    {
        $this->resetPage();
    }

    public function excluir(int $id): void
    {
        abort_unless(auth()->user()->isAdmin(), 403);

        $professora = Professora::findOrFail($id);
        $professora->deleted_by = auth()->id();
        $professora->save();
        $professora->delete();

        Audit::log('delete', 'professoras', $id, $professora->toArray());

        session()->flash('status', 'Professora excluída com sucesso.');
    }

    public function render()
    {
        $professoras = Professora::query()
            ->withCount('turmas')
            ->when($this->busca, fn ($q) => $q->where('nome', 'like', "%{$this->busca}%"))
            ->orderBy('nome')
            ->paginate(15);

        return view('livewire.professoras.index', compact('professoras'));
    }
}
