<?php

namespace App\Livewire;

use App\Models\Aluno;
use App\Models\Professora;
use App\Models\Turma;
use App\Support\Audit;
use League\Csv\Reader;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;
use Livewire\WithFileUploads;

#[Layout('layouts::app')]
#[Title('Importação')]
class Importacao extends Component
{
    use WithFileUploads;

    public $arquivo = null;

    public string $tipo = 'alunos';

    public ?array $resumo = null;

    protected function rules(): array
    {
        return [
            'tipo' => 'required|in:alunos,professoras,turmas',
            'arquivo' => 'required|file|max:10240',
        ];
    }

    public function importar(): void
    {
        $this->validate();
        $this->resumo = null;

        $path = $this->arquivo->getRealPath();
        $first = (string) file_get_contents($path, false, null, 0, 4000);
        $delimiter = str_contains($first, ';') ? ';' : (str_contains($first, "\t") ? "\t" : ',');

        $csv = Reader::createFromPath($path, 'r');
        $csv->setDelimiter($delimiter);
        $csv->skipEmptyRecords();
        $csv->setHeaderOffset(0);

        $registros = iterator_to_array($csv->getRecords());

        $inseridos = 0;
        $erros = [];

        foreach ($registros as $i => $row) {
            $row = $this->normalizar($row);
            $linha = $i + 2;

            try {
                match ($this->tipo) {
                    'alunos' => Aluno::create($this->mapAluno($row)),
                    'professoras' => Professora::create($this->mapProfessora($row)),
                    'turmas' => Turma::create($this->mapTurma($row)),
                };
                $inseridos++;
            } catch (\Throwable $e) {
                $erros[] = "Linha {$linha}: ".$e->getMessage();
            }
        }

        $this->resumo = ['inseridos' => $inseridos, 'erros' => $erros, 'total' => count($registros)];
        Audit::log('import', $this->tipo, null, null, $this->resumo);

        session()->flash('status', 'Importação concluída.');
        $this->arquivo = null;
    }

    private function normalizar(array $row): array
    {
        $out = [];
        foreach ($row as $key => $value) {
            $k = preg_replace('/[^a-z0-9]/', '', mb_strtolower((string) $key));
            $out[$k] = is_string($value) ? trim($value) : $value;
        }

        return $out;
    }

    private function pick(array $row, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (! empty($row[$k])) {
                return $row[$k];
            }
        }

        return null;
    }

    private function mapAluno(array $row): array
    {
        return [
            'nome' => $this->pick($row, ['nome', 'nomealuno', 'aluno']),
            'data_nascimento' => $this->data($this->pick($row, ['datanascimento', 'nascimento'])),
            'genero' => $this->pick($row, ['genero', 'sexo']),
            'turno' => $this->pick($row, ['turno']),
            'turma' => $this->pick($row, ['turma']),
            'nome_mae' => $this->pick($row, ['nomemae', 'mae']),
            'contato_mae' => $this->pick($row, ['contatome', 'contatomae', 'telefonemae']),
            'nome_pai' => $this->pick($row, ['nomepai', 'pai']),
            'contato_pai' => $this->pick($row, ['contatopai', 'telefonepai']),
        ];
    }

    private function mapProfessora(array $row): array
    {
        return [
            'nome' => $this->pick($row, ['nome', 'nomeprofessor', 'professor', 'professora']),
            'email' => $this->pick($row, ['email', 'emailprofessora']),
            'telefone' => $this->pick($row, ['telefone', 'tel', 'contato']),
            'especialidade' => $this->pick($row, ['especialidade', 'formacao']),
        ];
    }

    private function mapTurma(array $row): array
    {
        return [
            'nome' => $this->pick($row, ['nome', 'turma']),
            'turno' => $this->pick($row, ['turno']),
            'ano_letivo' => $this->pick($row, ['anoletivo', 'ano']),
        ];
    }

    private function data(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        $value = trim($value);

        if (preg_match('#^(\d{2})/(\d{2})/(\d{4})$#', $value, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }

        $ts = strtotime($value);

        return $ts ? date('Y-m-d', $ts) : null;
    }

    public function render()
    {
        return view('livewire.importacao');
    }
}
