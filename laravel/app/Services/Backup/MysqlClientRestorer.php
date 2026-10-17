<?php

namespace App\Services\Backup;

use App\Contracts\DatabaseRestorer;
use Illuminate\Support\Facades\Process;
use InvalidArgumentException;
use RuntimeException;

/**
 * Aplica um dump SQL no banco executando o binário `mysql` do container.
 *
 * O dump é transmitido por entrada padrão em streaming (`input()`), sem carregar
 * o arquivo inteiro na memória. A senha nunca vai para a linha de comando (onde
 * apareceria em `ps`/logs): ela é escrita num arquivo temporário de credenciais
 * (`--defaults-extra-file`) com permissão 0600, removido em `finally`.
 */
class MysqlClientRestorer implements DatabaseRestorer
{
    /**
     * @param  array<string, mixed>  $conexao  Conexão de banco (host, port, database, username, password)
     * @param  string  $binario  Caminho do binário `mysql`
     */
    public function __construct(
        private array $conexao,
        private string $binario = 'mysql',
    ) {}

    public function restore(string $sqlFilePath): void
    {
        $banco = (string) ($this->conexao['database'] ?? '');

        if (! preg_match('/^[A-Za-z0-9_]+$/', $banco)) {
            throw new InvalidArgumentException("Nome de banco inválido para a restauração: {$banco}");
        }

        if (! is_readable($sqlFilePath)) {
            throw new RuntimeException("Arquivo SQL não encontrado ou ilegível: {$sqlFilePath}");
        }

        $credenciais = $this->escreverCredenciais();

        try {
            $entrada = fopen($sqlFilePath, 'r');

            if ($entrada === false) {
                throw new RuntimeException('Não foi possível abrir o dump para restauração.');
            }

            $processo = Process::timeout(3600)
                ->input($entrada)
                ->run([
                    $this->binario,
                    '--defaults-extra-file='.$credenciais,
                    '--default-character-set=utf8mb4',
                    $banco,
                ]);

            if (! $processo->successful()) {
                throw new RuntimeException(
                    'Falha ao aplicar o dump no banco: '.$this->ultimasLinhas($processo->errorOutput())
                );
            }
        } finally {
            @unlink($credenciais);
        }
    }

    /**
     * Escreve o arquivo de credenciais temporário usado por --defaults-extra-file.
     */
    private function escreverCredenciais(): string
    {
        $arquivo = tempnam(sys_get_temp_dir(), 'escola-restore-');

        if ($arquivo === false) {
            throw new RuntimeException('Não foi possível criar o arquivo temporário de credenciais.');
        }

        chmod($arquivo, 0600);

        file_put_contents($arquivo, sprintf(
            "[client]\nhost=%s\nport=%s\nuser=%s\npassword=%s\n",
            (string) ($this->conexao['host'] ?? '127.0.0.1'),
            (string) ($this->conexao['port'] ?? '3306'),
            (string) ($this->conexao['username'] ?? ''),
            (string) ($this->conexao['password'] ?? ''),
        ));

        return $arquivo;
    }

    /**
     * Devolve as últimas linhas do stderr do processo, sem expor credenciais.
     */
    private function ultimasLinhas(string $saida): string
    {
        $linhas = array_filter(preg_split('/\R/', trim($saida)) ?: []);
        $linhas = array_slice($linhas, -5);

        return $linhas === [] ? '(sem saída de erro)' : implode(' | ', $linhas);
    }
}
