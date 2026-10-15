<?php

namespace App\Livewire\Alunos;

use App\Models\Aluno;
use App\Models\Turma;
use App\Support\Audit;
use App\Support\Media;
use Carbon\Carbon;
use Livewire\Attributes\Layout;
use Livewire\Component;
use Livewire\WithFileUploads;

#[Layout('layouts::app')]
class AlunoForm extends Component
{
    use WithFileUploads;

    public ?Aluno $aluno = null;

    public array $data = [];

    public $foto = null;

    public $documento = null;

    public function mount(?Aluno $aluno = null): void
    {
        $this->aluno = $aluno;

        if ($aluno && $aluno->exists) {
            $this->data = $aluno->only([
                'nome', 'genero', 'cpf_aluno', 'turma_id', 'turno',
                'nome_mae', 'contato_mae', 'cpf_mae',
                'nome_pai', 'contato_pai', 'cpf_pai', 'email_aluno',
                'endereco_rua', 'endereco_bairro', 'endereco_cidade',
                'descricao_alergia', 'observacoes_aniversario_escola',
                'contato_emergencia_nome', 'contato_emergencia_telefone',
                'responsaveis_retirada',
            ]);
            $this->data['data_nascimento'] = optional($aluno->data_nascimento)->format('Y-m-d');
            foreach (['alergia_intolerancia', 'usa_medicamento', 'necessita_atencao_medicamento',
                'aniversario_escola', 'autorizacao_fotos_redes', 'autorizacao_passeios', 'pode_brincar_areia'] as $b) {
                $this->data[$b] = (bool) $aluno->{$b};
            }
        } else {
            $this->data = array_merge([
                'nome' => '', 'genero' => '', 'cpf_aluno' => '', 'turma_id' => '', 'turno' => '',
                'data_nascimento' => '',
                'nome_mae' => '', 'contato_mae' => '', 'cpf_mae' => '',
                'nome_pai' => '', 'contato_pai' => '', 'cpf_pai' => '', 'email_aluno' => '',
                'endereco_rua' => '', 'endereco_bairro' => '', 'endereco_cidade' => '',
                'descricao_alergia' => '', 'observacoes_aniversario_escola' => '',
                'contato_emergencia_nome' => '', 'contato_emergencia_telefone' => '',
                'responsaveis_retirada' => '',
            ], [
                'alergia_intolerancia' => false, 'usa_medicamento' => false,
                'necessita_atencao_medicamento' => false, 'aniversario_escola' => false,
                'autorizacao_fotos_redes' => false, 'autorizacao_passeios' => false,
                'pode_brincar_areia' => false,
            ]);
        }
    }

    public function getTitleProperty(): string
    {
        return $this->aluno && $this->aluno->exists ? 'Editar aluno' : 'Novo aluno';
    }

    protected function rules(): array
    {
        return [
            'data.nome' => 'required|string|max:255',
            'data.data_nascimento' => 'nullable|date',
            'data.genero' => 'nullable|string|max:50',
            'data.cpf_aluno' => 'nullable|string|max:14',
            'data.turma_id' => 'nullable|exists:turmas,id',
            'data.turno' => 'nullable|string|max:50',
            'data.nome_mae' => 'nullable|string|max:255',
            'data.contato_mae' => 'nullable|string|max:100',
            'data.nome_pai' => 'nullable|string|max:255',
            'data.contato_pai' => 'nullable|string|max:100',
            'data.email_aluno' => 'nullable|email|max:255',
            'foto' => 'nullable|image|max:4096',
            'documento' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:8192',
        ];
    }

    public function salvar()
    {
        $validated = $this->validate();

        $payload = $validated['data'];
        if (empty($payload['turma_id'])) {
            $payload['turma_id'] = null;
        }
        if (empty($payload['data_nascimento'])) {
            $payload['data_nascimento'] = null;
        } else {
            $payload['data_nascimento'] = Carbon::parse($payload['data_nascimento'])->toDateString();
        }

        if ($this->foto) {
            $payload['foto'] = Media::storePhoto($this->foto, 'alunos/fotos', $this->aluno?->foto);
        }

        if ($this->documento) {
            $payload['foto_documento'] = Media::storeDocument($this->documento, 'alunos/documentos', $this->aluno?->foto_documento);
        }

        if ($this->aluno && $this->aluno->exists) {
            $before = $this->aluno->toArray();
            $this->aluno->update($payload);
            Audit::log('update', 'alunos', $this->aluno->id, $before, $this->aluno->fresh()->toArray());
            session()->flash('status', 'Aluno atualizado com sucesso.');
        } else {
            $aluno = Aluno::create($payload);
            Audit::log('create', 'alunos', $aluno->id, null, $aluno->toArray());
            session()->flash('status', 'Aluno cadastrado com sucesso.');
        }

        return redirect()->route('alunos.index');
    }

    public function render()
    {
        $turmas = Turma::orderBy('nome')->get();

        return view('livewire.alunos.form', ['turmas' => $turmas])
            ->title($this->getTitleProperty());
    }
}
