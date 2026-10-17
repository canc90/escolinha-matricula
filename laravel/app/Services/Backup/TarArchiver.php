<?php

namespace App\Services\Backup;

use App\Contracts\FileArchiver;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Compacta e descompacta diretórios usando o binário `tar` do container.
 *
 * Os argumentos são passados como ARRAY (sem shell) para evitar injeção.
 */
class TarArchiver implements FileArchiver
{
    public function __construct(private string $binario = 'tar') {}

    public function create(string $sourceDir, string $archivePath): void
    {
        $this->executar([$this->binario, '-czf', $archivePath, '-C', $sourceDir, '.']);
    }

    public function extract(string $archivePath, string $destinationDir): void
    {
        $this->executar([
            $this->binario,
            '-xzf',
            $archivePath,
            '-C',
            $destinationDir,
            '--no-same-owner',
            '--no-same-permissions',
        ]);
    }

    public function list(string $archivePath): array
    {
        $saida = $this->executar([$this->binario, '-tzf', $archivePath]);

        $entradas = preg_split('/\R/', trim($saida)) ?: [];

        return array_values(array_filter($entradas, fn (string $linha): bool => $linha !== ''));
    }

    /**
     * Executa o tar e devolve a saída padrão; lança em caso de falha.
     *
     * @param  array<int, string>  $argumentos
     */
    private function executar(array $argumentos): string
    {
        $processo = new Process($argumentos);
        $processo->setTimeout(1800);
        $processo->run();

        if (! $processo->isSuccessful()) {
            $linhas = array_slice(array_filter(preg_split('/\R/', trim($processo->getErrorOutput())) ?: []), -5);

            throw new RuntimeException(
                'Falha ao executar o tar: '.($linhas === [] ? '(sem saída de erro)' : implode(' | ', $linhas))
            );
        }

        return $processo->getOutput();
    }
}
