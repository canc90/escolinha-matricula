<?php

namespace App\Livewire\Frequencias;

use App\Models\Aluno;
use App\Models\Frequencia;
use App\Models\Turma;
use App\Support\Audit;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Frequências')]
class FrequenciasIndex extends Component
{
    public ?int $turmaId = null;

    public string $data = '';

    public array $presencas = [];

    public function mount(): void
    {
        $this->data = now()->toDateString();

        if ($turma = request()->integer('turma')) {
            $this->turmaId = $turma;
        }

        $this->carregar();
    }

    public function updatedTurmaId(): void
    {
        $this->carregar();
    }

    public function updatedData(): void
    {
        $this->carregar();
    }

    public function carregar(): void
    {
        if (! $this->turmaId || ! $this->data) {
            $this->presencas = [];

            return;
        }

        $alunos = Aluno::where('turma_id', $this->turmaId)->orderBy('nome')->get();
        $existentes = Frequencia::where('turma_id', $this->turmaId)
            ->where('data', $this->data)
            ->pluck('presente', 'aluno_id');

        $this->presencas = [];
        foreach ($alunos as $aluno) {
            $this->presencas[$aluno->id] = $existentes->has($aluno->id)
                ? (bool) $existentes[$aluno->id]
                : true;
        }
    }

    public function marcarTodos(bool $presente): void
    {
        foreach (array_keys($this->presencas) as $id) {
            $this->presencas[$id] = $presente;
        }
    }

    public function salvar(): void
    {
        abort_unless(auth()->check(), 403);
        $this->validate([
            'turmaId' => 'required|exists:turmas,id',
            'data' => 'required|date',
        ]);

        foreach ($this->presencas as $alunoId => $presente) {
            Frequencia::updateOrCreate(
                ['turma_id' => $this->turmaId, 'aluno_id' => $alunoId, 'data' => $this->data],
                ['presente' => (bool) $presente]
            );
        }

        Audit::log('update', 'frequencias', $this->turmaId, null, ['data' => $this->data]);

        session()->flash('status', 'Chamada salva com sucesso.');
    }

    public function render()
    {
        $turmas = Turma::orderBy('nome')->get();

        $alunos = $this->turmaId
            ? Aluno::where('turma_id', $this->turmaId)->orderBy('nome')->get()
            : collect();

        $presentes = collect($this->presencas)->filter()->count();

        return view('livewire.frequencias.index', compact('turmas', 'alunos', 'presentes'));
    }
}
