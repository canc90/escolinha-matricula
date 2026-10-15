<?php

namespace App\Livewire;

use App\Models\Alert;
use App\Models\Turma;
use App\Services\AiEducacional;
use App\Services\RiskEngine;
use App\Support\Audit;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('IA Educacional')]
class IaEducacional extends Component
{
    /** @var array<int, string> */
    public array $recomendacoes = [];

    public function gerarAlertas(RiskEngine $engine): void
    {
        $gerados = $engine->gerarAlertas();
        Audit::log('generate', 'alerts', null, null, ['gerados' => $gerados]);

        session()->flash('status', "{$gerados} novo(s) alerta(s) gerado(s).");
    }

    public function recomendar(int $turmaId, RiskEngine $engine, AiEducacional $ia): void
    {
        $turma = Turma::findOrFail($turmaId);
        $risco = $engine->riscoTurma($turmaId);

        $this->recomendacoes[$turmaId] = $ia->recomendarTurma($turma, $risco);
    }

    public function resolver(int $id): void
    {
        $alert = Alert::findOrFail($id);
        $alert->update([
            'resolved' => true,
            'resolved_by' => auth()->id(),
            'resolved_at' => now(),
        ]);

        Audit::log('resolve', 'alerts', $id);

        session()->flash('status', 'Alerta resolvido.');
    }

    public function render(RiskEngine $engine, AiEducacional $ia)
    {
        $turmas = Turma::orderBy('nome')->get()->map(fn ($t) => [
            'turma' => $t,
            'risco' => $engine->riscoTurma($t->id),
        ])->sortBy('risco.percentual')->values();

        $alertas = Alert::with(['turma', 'aluno'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $iaConfigurada = $ia->isConfigured();

        return view('livewire.ia-educacional', compact('turmas', 'alertas', 'iaConfigurada'));
    }
}
