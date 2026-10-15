<?php

namespace App\Console\Commands;

use App\Models\Aluno;
use App\Models\Professora;
use App\Support\Media;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class ImportUploads extends Command
{
    protected $signature = 'escola:import-uploads
                            {--source=/old-uploads/fotos : Diretório de origem das fotos e documentos}';

    protected $description = 'Importa fotos e documentos do sistema antigo para o storage público.';

    public function handle(): int
    {
        $source = rtrim((string) $this->option('source'), '/');

        if (! is_dir($source)) {
            $this->error("Diretório de origem não encontrado: {$source}");

            return self::FAILURE;
        }

        $importados = 0;
        $ausentes = 0;
        $ignorados = 0;

        foreach ($this->alvos() as [$model, $campo, $diretorio]) {
            foreach ($this->registros($model, $campo) as $registro) {
                $antigo = (string) $registro->{$campo};

                if (! str_contains($antigo, '/uploads/')) {
                    $ignorados++;

                    continue;
                }

                $arquivo = $source.'/'.basename($antigo);

                if (! is_file($arquivo)) {
                    $ausentes++;
                    $this->warn('Ausente: '.basename($antigo)." (id {$registro->getKey()})");

                    continue;
                }

                $novo = $campo === 'foto'
                    ? Media::storePhotoFromPath($arquivo, $diretorio)
                    : Media::storeDocumentFromPath($arquivo, $diretorio);

                $registro->forceFill([$campo => $novo])->save();
                $importados++;
            }
        }

        $this->newLine();
        $this->table(['Resultado', 'Quantidade'], [
            ['Importados', $importados],
            ['Arquivos ausentes', $ausentes],
            ['Ignorados (não legados)', $ignorados],
        ]);

        return self::SUCCESS;
    }

    /**
     * @return array<int, array{0: class-string<Model>, 1: string, 2: string}>
     */
    private function alvos(): array
    {
        return [
            [Aluno::class, 'foto', 'alunos/fotos'],
            [Aluno::class, 'foto_documento', 'alunos/documentos'],
            [Professora::class, 'foto', 'professoras/fotos'],
            [Professora::class, 'foto_documento', 'professoras/documentos'],
        ];
    }

    /**
     * @param  class-string<Model>  $model
     * @return Collection<int, Model>
     */
    private function registros(string $model, string $campo): Collection
    {
        return $model::query()
            ->whereNotNull($campo)
            ->where($campo, '<>', '')
            ->get();
    }
}
