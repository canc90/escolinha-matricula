<?php

namespace Tests\Feature\Concerns;

use App\Contracts\DatabaseDumper;
use App\Contracts\FileArchiver;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Utilidades compartilhadas pelos testes de backup e restauração.
 *
 * Os dublês são criados DENTRO de cada teste, chamando estes fabricantes — nunca
 * no setUp() — para que cada teste receba uma instância nova e isolada.
 */
trait UsaBackupDeTeste
{
    /**
     * Cria (e aponta em configuração) um diretório de backups isolado por teste.
     *
     * O diretório fica dentro de um pai aleatório: isso dá isolamento entre
     * testes e deixa o irmão `backups-evil` (prefixo textual comum ao nome
     * `backups`) ao lado dele, para o teste de contenção de caminho.
     */
    protected function prepararDiretorioDeBackup(string $nome = 'backups'): string
    {
        $caminho = storage_path('framework/testing/'.Str::random(10).'/'.$nome);

        File::ensureDirectoryExists($caminho);

        config(['escola.backup.caminho' => $caminho]);

        $this->beforeApplicationDestroyed(fn () => File::deleteDirectory(dirname($caminho)));

        return $caminho;
    }

    /**
     * SQL que o dublê de dump grava; aplicável no SQLite em memória dos testes.
     */
    protected function sqlDeBackup(): string
    {
        return "CREATE TABLE IF NOT EXISTS alunos_restore_teste (id INTEGER PRIMARY KEY, nome TEXT);\n"
            ."INSERT INTO alunos_restore_teste (id, nome) VALUES (1, 'Restaurado do backup');\n";
    }

    /**
     * Registra um dumper de mentira que grava o SQL informado.
     */
    protected function dumperFalso(?string $sql = null): object
    {
        $dumper = new class($sql ?? $this->sqlDeBackup()) implements DatabaseDumper
        {
            public function __construct(private string $sql) {}

            public function dump(string $sqlFilePath): void
            {
                file_put_contents($sqlFilePath, $this->sql);
            }
        };

        $this->app->bind(DatabaseDumper::class, fn () => $dumper);

        return $dumper;
    }

    /**
     * Registra um dumper de mentira que sempre falha.
     */
    protected function dumperQueFalha(string $mensagem = 'falha simulada do dumper'): void
    {
        $this->app->bind(DatabaseDumper::class, fn () => new class($mensagem) implements DatabaseDumper
        {
            public function __construct(private string $mensagem) {}

            public function dump(string $sqlFilePath): void
            {
                throw new RuntimeException($this->mensagem);
            }
        });
    }

    /**
     * Banco de destino da restauração no ambiente atual do teste.
     */
    protected function bancoDestinoDoTeste(): string
    {
        return (string) config('database.connections.'.config('escola.backup.conexao').'.database');
    }

    /**
     * Diretórios dentro do diretório de backups, em ordem alfabética.
     *
     * @return array<int, string>
     */
    protected function diretoriosDeBackup(string $caminho): array
    {
        $diretorios = File::directories($caminho);

        sort($diretorios);

        return array_values($diretorios);
    }

    /**
     * Conteúdo descompactado de um arquivo gzip.
     */
    protected function conteudoDescompactado(string $arquivo): string
    {
        $conteudo = gzdecode((string) file_get_contents($arquivo));

        if ($conteudo === false) {
            $this->fail("Arquivo gzip inválido: {$arquivo}");
        }

        return $conteudo;
    }

    /**
     * Entradas de um arquivo tar, sem o prefixo "./" que o tar escreve.
     *
     * @return array<int, string>
     */
    protected function entradasDoTar(string $arquivo): array
    {
        $entradas = app(FileArchiver::class)->list($arquivo);

        return array_values(array_map(
            fn (string $linha): string => (string) preg_replace('#^\./#', '', $linha),
            $entradas,
        ));
    }
}
