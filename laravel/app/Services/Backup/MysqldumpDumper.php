<?php

namespace App\Services\Backup;

use App\Contracts\DatabaseDumper;
use Illuminate\Support\Facades\Process;
use InvalidArgumentException;
use RuntimeException;

/**
 * Gera o dump do banco executando o binário `mysqldump` do container.
 *
 * A senha nunca vai para a linha de comando (onde apareceria em `ps`/logs): ela
 * é escrita num arquivo temporário de credenciais (`--defaults-extra-file`) com
 * permissão 0600, removido em `finally`. Os argumentos são passados como ARRAY
 * para o Process, sem shell, o que evita injeção e não expõe segredos.
 */
class MysqldumpDumper implements DatabaseDumper
{
    /**
     * @param  array<string, mixed>  $conexao  Conexão de banco (host, port, database, username, password)
     * @param  string  $binario  Caminho do binário `mysqldump`
     */
    public function __construct(
        private array $conexao,
        private string $binario = 'mysqldump',
    ) {}

    public function dump(string $sqlFilePath): void
    {
        $banco = (string) ($this->conexao['database'] ?? '');

        if (! preg_match('/^[A-Za-z0-9_]+$/', $banco)) {
            throw new InvalidArgumentException("Nome de banco inválido para o backup: {$banco}");
        }

        $credenciais = $this->escreverCredenciais();

        try {
            $processo = Process::timeout(3600)->run([
                $this->binario,
                '--defaults-extra-file='.$credenciais,
                '--single-transaction',
                '--quick',
                '--no-tablespaces',
                '--routines',
                '--events',
                '--triggers',
                '--default-character-set=utf8mb4',
                '--result-file='.$sqlFilePath,
                $banco,
            ]);

            if (! $processo->successful()) {
                throw new RuntimeException(
                    'Falha ao gerar o dump do banco: '.$this->ultimasLinhas($processo->errorOutput())
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
        $arquivo = tempnam(sys_get_temp_dir(), 'escola-backup-');

        if ($arquivo === false) {
            throw new RuntimeException('Não foi possível criar o arquivo temporário de credenciais.');
        }

        chmod($arquivo, 0600);

        $conteudo = sprintf(
            "[client]\nhost=%s\nport=%s\nuser=%s\npassword=%s\n",
            (string) ($this->conexao['host'] ?? '127.0.0.1'),
            (string) ($this->conexao['port'] ?? '3306'),
            (string) ($this->conexao['username'] ?? ''),
            (string) ($this->conexao['password'] ?? ''),
        );

        file_put_contents($arquivo, $conteudo);

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
