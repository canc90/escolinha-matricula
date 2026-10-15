<?php

namespace App\Livewire\Professoras;

use App\Models\Professora;
use App\Models\Turma;
use App\Support\Audit;
use App\Support\Media;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;
use Livewire\WithFileUploads;

#[Layout('layouts::app')]
#[Title('Professora')]
class ProfessoraForm extends Component
{
    use WithFileUploads;

    public ?Professora $professora = null;

    public array $data = [];

    public array $turmasSelecionadas = [];

    public $foto = null;

    public $documento = null;

    public function mount(?Professora $professora = null): void
    {
        $this->professora = $professora;

        if ($professora && $professora->exists) {
            $this->data = $professora->only(['nome', 'email', 'telefone', 'especialidade', 'rg', 'cpf', 'turno']);
            $this->turmasSelecionadas = $professora->turmas()->pluck('turmas.id')->all();
        } else {
            $this->data = ['nome' => '', 'email' => '', 'telefone' => '', 'especialidade' => '', 'rg' => '', 'cpf' => '', 'turno' => ''];
        }
    }

    protected function rules(): array
    {
        return [
            'data.nome' => 'required|string|max:255',
            'data.email' => 'nullable|email|max:254',
            'data.telefone' => 'nullable|string|max:50',
            'data.especialidade' => 'nullable|string|max:255',
            'data.rg' => 'nullable|string|max:20',
            'data.cpf' => 'nullable|string|max:14',
            'data.turno' => 'nullable|string|max:50',
            'turmasSelecionadas' => 'array',
            'foto' => 'nullable|image|max:4096',
            'documento' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:8192',
        ];
    }

    public function salvar()
    {
        $validated = $this->validate();
        $payload = $validated['data'];

        if ($this->foto) {
            $payload['foto'] = Media::storePhoto($this->foto, 'professoras/fotos', $this->professora?->foto);
        }

        if ($this->documento) {
            $payload['foto_documento'] = Media::storeDocument($this->documento, 'professoras/documentos', $this->professora?->foto_documento);
        }

        if ($this->professora && $this->professora->exists) {
            $before = $this->professora->toArray();
            $this->professora->update($payload);
            $prof = $this->professora;
            Audit::log('update', 'professoras', $prof->id, $before, $prof->fresh()->toArray());
            session()->flash('status', 'Professora atualizada com sucesso.');
        } else {
            $prof = Professora::create($payload);
            Audit::log('create', 'professoras', $prof->id, null, $prof->toArray());
            session()->flash('status', 'Professora cadastrada com sucesso.');
        }

        $sync = [];
        foreach ($this->turmasSelecionadas as $turmaId) {
            $sync[$turmaId] = ['created_at' => now()];
        }
        $prof->turmas()->sync($sync);

        return redirect()->route('professoras.index');
    }

    public function render()
    {
        $turmas = Turma::orderBy('nome')->get();

        return view('livewire.professoras.form', compact('turmas'));
    }
}
