<?php

namespace App\Livewire\Turmas;

use App\Models\Professora;
use App\Models\Turma;
use App\Support\Audit;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Turma')]
class TurmaForm extends Component
{
    public ?Turma $turma = null;

    public array $data = [];

    public array $professorasSelecionadas = [];

    public function mount(?Turma $turma = null): void
    {
        $this->turma = $turma;

        if ($turma && $turma->exists) {
            $this->data = $turma->only(['nome', 'turno', 'ano_letivo']);
            $this->professorasSelecionadas = $turma->professoras()->pluck('professoras.id')->all();
        } else {
            $this->data = ['nome' => '', 'turno' => '', 'ano_letivo' => date('Y')];
        }
    }

    protected function rules(): array
    {
        return [
            'data.nome' => 'required|string|max:50',
            'data.turno' => 'nullable|string|max:50',
            'data.ano_letivo' => 'nullable|string|max:10',
            'professorasSelecionadas' => 'array',
        ];
    }

    public function salvar()
    {
        $validated = $this->validate();
        $payload = $validated['data'];

        if ($this->turma && $this->turma->exists) {
            $before = $this->turma->toArray();
            $this->turma->update($payload);
            $turma = $this->turma;
            Audit::log('update', 'turmas', $turma->id, $before, $turma->fresh()->toArray());
            session()->flash('status', 'Turma atualizada com sucesso.');
        } else {
            $turma = Turma::create($payload);
            Audit::log('create', 'turmas', $turma->id, null, $turma->toArray());
            session()->flash('status', 'Turma cadastrada com sucesso.');
        }

        $sync = [];
        foreach ($this->professorasSelecionadas as $profId) {
            $sync[$profId] = ['created_at' => now()];
        }
        $turma->professoras()->sync($sync);

        return redirect()->route('turmas.index');
    }

    public function render()
    {
        $professoras = Professora::orderBy('nome')->get();

        return view('livewire.turmas.form', compact('professoras'));
    }
}
