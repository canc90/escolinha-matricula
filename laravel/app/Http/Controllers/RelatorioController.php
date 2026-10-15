<?php

namespace App\Http\Controllers;

use App\Models\Aluno;
use App\Models\Frequencia;
use App\Models\Professora;
use App\Models\Turma;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Collection;
use League\Csv\Writer;

class RelatorioController extends Controller
{
    /**
     * Ficha cadastral do aluno em PDF.
     */
    public function alunoPdf(Aluno $aluno)
    {
        $aluno->load('turmaVinculada');

        $pdf = Pdf::loadView('relatorios.aluno-pdf', ['aluno' => $aluno]);

        return $pdf->download("ficha-aluno-{$aluno->id}.pdf");
    }

    /**
     * Relatório de frequência da turma em PDF.
     */
    public function turmaPdf(Turma $turma)
    {
        $dados = $this->dadosTurma($turma);

        $pdf = Pdf::loadView('relatorios.turma-pdf', [
            'turma' => $turma,
            'professoras' => $dados['professoras'],
            'linhas' => $dados['linhas'],
        ]);

        return $pdf->download("frequencia-turma-{$turma->id}.pdf");
    }

    /**
     * Relatório de frequência da turma em CSV.
     */
    public function turmaCsv(Turma $turma): Response
    {
        $dados = $this->dadosTurma($turma);

        $csv = Writer::createFromString();
        $csv->insertOne(['Aluno', 'Presenças', 'Faltas', '% Presença']);
        foreach ($dados['linhas'] as $linha) {
            $csv->insertOne([
                $linha['aluno']->nome,
                $linha['presentes'],
                $linha['faltas'],
                $linha['percentual'] ?? '',
            ]);
        }

        return response("\xEF\xBB\xBF".$csv->toString(), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"frequencia-turma-{$turma->id}.csv\"",
        ]);
    }

    /**
     * Monta os dados de frequência de uma turma sem N+1.
     *
     * @return array{professoras: Collection<int, Professora>, linhas: Collection<int, array<string, mixed>>}
     */
    private function dadosTurma(Turma $turma): array
    {
        $stats = Frequencia::query()
            ->where('turma_id', $turma->id)
            ->selectRaw('aluno_id, COUNT(*) as total, SUM(presente) as presentes')
            ->groupBy('aluno_id')
            ->get()
            ->keyBy('aluno_id');

        $linhas = Aluno::query()
            ->where('turma_id', $turma->id)
            ->orderBy('nome')
            ->get()
            ->map(function (Aluno $aluno) use ($stats): array {
                $total = (int) ($stats[$aluno->id]->total ?? 0);
                $presentes = (int) ($stats[$aluno->id]->presentes ?? 0);

                return [
                    'aluno' => $aluno,
                    'total' => $total,
                    'presentes' => $presentes,
                    'faltas' => $total - $presentes,
                    'percentual' => $total > 0 ? (int) round($presentes / $total * 100) : null,
                ];
            });

        return [
            'professoras' => $turma->professoras()->get(),
            'linhas' => $linhas,
        ];
    }
}
