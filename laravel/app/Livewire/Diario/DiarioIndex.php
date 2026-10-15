<?php

namespace App\Livewire\Diario;

use App\Models\DiarioClasse;
use App\Models\Professora;
use App\Models\Turma;
use App\Support\Audit;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;
use Livewire\WithPagination;

#[Layout('layouts::app')]
#[Title('Diário de classe')]
class DiarioIndex extends Component
{
    use WithPagination;

    public ?int $turmaFiltro = null;

    public array $form = [
        'turma_id' => '',
        'professora_id' => '',
        'data' => '',
        'conteudo_aula' => '',
        'observacoes' => '',
    ];

    public function mount(): void
    {
        $this->form['data'] = now()->toDateString();

        $user = auth()->user();
        if ($user->isProfessora() && $user->professora) {
            $this->form['professora_id'] = $user->professora->id;
        }
    }

    public function updatingTurmaFiltro(): void
    {
        $this->resetPage();
    }

    protected function rules(): array
    {
        return [
            'form.turma_id' => 'required|exists:turmas,id',
            'form.professora_id' => 'nullable|exists:professoras,id',
            'form.data' => 'required|date',
            'form.conteudo_aula' => 'nullable|string',
            'form.observacoes' => 'nullable|string',
        ];
    }

    public function salvar(): void
    {
        $validated = $this->validate();
        $payload = $validated['form'];
        if (empty($payload['professora_id'])) {
            $payload['professora_id'] = null;
        }

        $registro = DiarioClasse::create($payload);
        Audit::log('create', 'diario_classe', $registro->id, null, $registro->toArray());

        $this->reset('form');
        $this->form['data'] = now()->toDateString();
        if (auth()->user()->isProfessora() && auth()->user()->professora) {
            $this->form['professora_id'] = auth()->user()->professora->id;
        }

        session()->flash('status', 'Registro do diário salvo com sucesso.');
    }

    public function excluir(int $id): void
    {
        abort_unless(auth()->user()->isAdmin(), 403);

        $registro = DiarioClasse::findOrFail($id);
        $registro->deleted_by = auth()->id();
        $registro->save();
        $registro->delete();

        Audit::log('delete', 'diario_classe', $id, $registro->toArray());

        session()->flash('status', 'Registro excluído.');
    }

    public function render()
    {
        $registros = DiarioClasse::query()
            ->with(['turma', 'professora'])
            ->when($this->turmaFiltro, fn ($q) => $q->where('turma_id', $this->turmaFiltro))
            ->orderByDesc('data')
            ->paginate(15);

        $turmas = Turma::orderBy('nome')->get();
        $professoras = Professora::orderBy('nome')->get();

        return view('livewire.diario.index', compact('registros', 'turmas', 'professoras'));
    }
}
