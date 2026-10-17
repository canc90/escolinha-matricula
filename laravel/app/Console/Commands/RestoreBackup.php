<?php

namespace App\Console\Commands;

use App\Contracts\DatabaseRestorer;
use App\Contracts\FileArchiver;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Restaura o banco de dados e os uploads a partir de um diretório de backup
 * gerado pelo comando `escola:backup`.
 *
 * Todas as guardas (integridade, coerência de ambiente/banco, exigência de
 * --force em produção) rodam ANTES de qualquer escrita: uma restauração
 * destrutiva sem guarda não é qualidade de produção.
 */
class RestoreBackup extends Command
{
    protected $signature = 'escola:restore-backup
                            {--file= : Diretório do backup (padrão: o mais recente)}
                            {--force : Confirma a sobrescrita destrutiva dos dados}
                            {--dry-run : Valida o artefato e mostra o plano sem escrever nada}';

    protected $description = 'Restaura o banco de dados e os uploads a partir de um backup do escola:backup.';

    public function __construct(
        private DatabaseRestorer $restaurador,
        private FileArchiver $arquivador,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        try {
            $diretorio = $this->resolverBackup();
            $manifesto = $this->validarArtefato($diretorio);
            $divergencias = $this->divergenciasDeCoerencia($manifesto);

            if ($this->option('dry-run')) {
                $this->imprimirPlano($diretorio, $manifesto);
                $this->reportarDivergencias($divergencias);

                return self::SUCCESS;
            }

            if (! $this->confirmarCoerencia($divergencias)) {
                return self::FAILURE;
            }

            if (! $this->confirmarProducao()) {
                return self::FAILURE;
            }

            $this->aplicar($diretorio);
            $this->resumo($diretorio);

            return self::SUCCESS;
        } catch (Throwable $e) {
            $this->error('Falha ao restaurar o backup: '.$e->getMessage());

            return self::FAILURE;
        }
    }

    /**
     * Entrega o backup mais recente (ou o indicado em --file), exigindo que o
     * caminho fique DENTRO do diretório de backups configurado.
     */
    protected function resolverBackup(): string
    {
        $configurado = (string) config('escola.backup.caminho');
        $base = realpath($configurado);

        if ($base === false || ! is_dir($base)) {
            throw new RuntimeException("Diretório de backups não encontrado: {$configurado}");
        }

        $informado = (string) ($this->option('file') ?? '');

        if ($informado === '') {
            return $this->backupMaisRecente($base);
        }

        $caminho = str_starts_with($informado, '/') ? $informado : $base.'/'.trim($informado, '/');
        $real = realpath($caminho);

        if ($real === false) {
            throw new RuntimeException("Backup não encontrado: {$informado}");
        }

        // Contenção comparada COM separador final. Sem ele, o diretório irmão
        // "backups-evil" (prefixo textual comum ao diretório de backups)
        // passaria na checagem e a restauração leria fora do repositório.
        $permitido = rtrim($base, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR;

        if (! str_starts_with($real.DIRECTORY_SEPARATOR, $permitido)) {
            throw new RuntimeException("O caminho informado não fica dentro do diretório de backups: {$informado}");
        }

        return $real;
    }

    /**
     * Escolhe o subdiretório `backup-*` mais recente por ordenação de nome.
     */
    protected function backupMaisRecente(string $base): string
    {
        $candidatos = array_values(array_filter(
            File::directories($base),
            fn (string $caminho): bool => str_starts_with(basename($caminho), 'backup-')
        ));

        if ($candidatos === []) {
            throw new RuntimeException("Nenhum backup encontrado em {$base}.");
        }

        sort($candidatos);

        return (string) end($candidatos);
    }

    /**
     * Valida o artefato ANTES de qualquer escrita e devolve o manifesto.
     *
     * @return array<string, mixed>
     */
    protected function validarArtefato(string $diretorio): array
    {
        $caminhoManifesto = $diretorio.'/manifest.json';

        if (! File::isFile($caminhoManifesto)) {
            throw new RuntimeException(
                'Backup incompleto: manifest.json não encontrado em '.basename($diretorio).'.'
            );
        }

        $manifesto = json_decode((string) File::get($caminhoManifesto), true);

        if (! is_array($manifesto)) {
            throw new RuntimeException('manifest.json inválido: o conteúdo não é um objeto JSON.');
        }

        if (! isset($manifesto['formato']) || $manifesto['formato'] !== 1) {
            $encontrado = isset($manifesto['formato']) ? var_export($manifesto['formato'], true) : 'ausente';

            throw new RuntimeException("Formato de manifesto não suportado (esperado 1, encontrado {$encontrado}).");
        }

        if (! isset($manifesto['artefatos']) || ! is_array($manifesto['artefatos'])) {
            throw new RuntimeException('manifest.json inválido: a seção "artefatos" está ausente.');
        }

        foreach (['banco' => 'database.sql.gz', 'uploads' => 'uploads.tar.gz'] as $chave => $nome) {
            $this->conferirIntegridade($diretorio, $manifesto, $chave, $nome);
        }

        $this->conferirEntradasDosUploads($diretorio.'/uploads.tar.gz');

        return $manifesto;
    }

    /**
     * Confere existência e sha256 de um artefato contra o manifesto.
     *
     * @param  array<string, mixed>  $manifesto
     */
    protected function conferirIntegridade(string $diretorio, array $manifesto, string $chave, string $nome): void
    {
        $arquivo = $diretorio.'/'.$nome;

        if (! File::isFile($arquivo)) {
            throw new RuntimeException("Backup incompleto: {$nome} não encontrado.");
        }

        $sha = $manifesto['artefatos'][$chave]['sha256'] ?? null;

        if (! is_string($sha) || $sha === '') {
            throw new RuntimeException("manifest.json incompleto: artefatos.{$chave}.sha256 está ausente.");
        }

        if (! hash_equals($sha, (string) hash_file('sha256', $arquivo))) {
            throw new RuntimeException("Artefato {$nome} corrompido: o sha256 não confere com o manifesto.");
        }
    }

    /**
     * Recusa arquivos tar com caminho absoluto ou relativo para fora do destino
     * (zip-slip) antes de extrair qualquer coisa.
     */
    protected function conferirEntradasDosUploads(string $arquivo): void
    {
        foreach ($this->arquivador->list($arquivo) as $entrada) {
            if (str_starts_with($entrada, '/') || preg_match('#(^|/)\.\.(/|$)#', $entrada) === 1) {
                throw new RuntimeException(
                    "Arquivo de uploads com caminho inválido ({$entrada}): restauração abortada."
                );
            }
        }
    }

    /**
     * Lista as divergências entre o manifesto e o destino (ambiente e banco).
     *
     * @param  array<string, mixed>  $manifesto
     * @return array<int, string>
     */
    protected function divergenciasDeCoerencia(array $manifesto): array
    {
        $divergencias = [];

        $ambienteBackup = (string) ($manifesto['ambiente'] ?? '');
        $ambienteAtual = app()->environment();

        if ($ambienteBackup !== $ambienteAtual) {
            $divergencias[] = "ambiente do backup={$ambienteBackup} / ambiente atual={$ambienteAtual}";
        }

        $bancoBackup = (string) ($manifesto['banco'] ?? '');
        $bancoAtual = $this->bancoDestino();

        if ($bancoBackup !== $bancoAtual) {
            $divergencias[] = "banco do backup={$bancoBackup} / banco atual={$bancoAtual}";
        }

        return $divergencias;
    }

    /**
     * Imprime as divergências encontradas (usado pelo --dry-run).
     *
     * @param  array<int, string>  $divergencias
     */
    protected function reportarDivergencias(array $divergencias): void
    {
        if ($divergencias === []) {
            return;
        }

        foreach ($divergencias as $linha) {
            $this->warn($linha);
        }

        $this->warn('divergência: seria recusada sem --force');
    }

    /**
     * Decide se a restauração pode prosseguir diante das divergências.
     *
     * @param  array<int, string>  $divergencias
     */
    protected function confirmarCoerencia(array $divergencias): bool
    {
        if ($divergencias === []) {
            return true;
        }

        if ($this->option('force')) {
            $this->warn('Divergência de ambiente/banco aceita por --force:');

            foreach ($divergencias as $linha) {
                $this->warn('  '.$linha);
            }

            return true;
        }

        $this->error('Restauração recusada: o backup é de outro ambiente ou de outro banco.');

        foreach ($divergencias as $linha) {
            $this->error('  '.$linha);
        }

        return false;
    }

    /**
     * Exige --force em produção: aplica a mesma confirmação destrutiva mesmo que
     * o operador esteja em outro diretório de trabalho.
     */
    protected function confirmarProducao(): bool
    {
        if (app()->environment('production') && ! $this->option('force')) {
            $this->error('Restauração recusada: em produção é obrigatório passar --force para sobrescrever dados.');
            $this->line('Seriam sobrescritos: o banco "'.$this->bancoDestino().'" e os uploads do disco público.');

            return false;
        }

        $this->warn('Atenção: o conteúdo atual do banco e dos uploads será substituído pelo do backup.');

        return true;
    }

    /**
     * Mostra o que seria restaurado, sem escrever nada.
     *
     * @param  array<string, mixed>  $manifesto
     */
    protected function imprimirPlano(string $diretorio, array $manifesto): void
    {
        $dump = $diretorio.'/database.sql.gz';
        $tamanho = File::isFile($dump)
            ? number_format(((int) filesize($dump)) / 1048576, 2, ',', '.').' MB'
            : '(ausente)';

        $this->table(['Item', 'Valor'], [
            ['Origem do backup', $diretorio],
            ['Gerado em', (string) ($manifesto['gerado_em'] ?? '(não informado)')],
            ['Formato do manifesto', (string) ($manifesto['formato'] ?? '(não informado)')],
            ['Dump (database.sql.gz)', $tamanho],
            ['Uploads', 'uploads.tar.gz (extração aditiva)'],
            ['Banco de destino', $this->bancoDestino()],
            ['Ambiente de destino', app()->environment()],
        ]);

        $this->line('Nada foi escrito: este é apenas o plano (--dry-run).');
    }

    /**
     * Aplica o dump no banco e extrai os uploads no disco público.
     */
    protected function aplicar(string $diretorio): void
    {
        $temporario = tempnam(sys_get_temp_dir(), 'escola-restore-');

        if ($temporario === false) {
            throw new RuntimeException('Não foi possível criar o arquivo temporário do dump.');
        }

        try {
            $this->descompactar($diretorio.'/database.sql.gz', $temporario);
            $this->restaurador->restore($temporario);
        } finally {
            @unlink($temporario);
        }

        // O dump restaurado carrega o estado de cache/locks do instante em que
        // foi gerado — inclusive o lock do próprio escola:backup e o mutex do
        // agendamento. Sem limpar, o sistema recém-restaurado ficaria travado
        // ("Já existe um backup em execução") até o lock expirar, e o backup
        // diário poderia ser pulado. `Cache::flush()` limpa os dados, mas o
        // store `database` guarda os locks em tabela separada (`cache_locks`),
        // por isso o flushLocks() extra.
        $this->limparCacheELocks();

        $raizPublica = Storage::disk('public')->path('');

        File::ensureDirectoryExists($raizPublica);

        $this->arquivador->extract($diretorio.'/uploads.tar.gz', $raizPublica);
    }

    /**
     * Descompacta o dump em blocos de 1 MB, sem carregar tudo na memória.
     */
    protected function descompactar(string $gz, string $destino): void
    {
        $entrada = gzopen($gz, 'rb');
        $saida = fopen($destino, 'wb');

        if ($entrada === false || $saida === false) {
            throw new RuntimeException('Não foi possível abrir os arquivos do dump para restauração.');
        }

        try {
            while (! gzeof($entrada)) {
                $bloco = gzread($entrada, 1024 * 1024);

                if ($bloco === false) {
                    throw new RuntimeException('Falha ao descompactar o dump do banco.');
                }

                fwrite($saida, $bloco);
            }
        } finally {
            gzclose($entrada);
            fclose($saida);
        }
    }

    /**
     * Limpa o cache e os locks restaurados do dump.
     */
    protected function limparCacheELocks(): void
    {
        Cache::flush();

        $store = Cache::store()->getStore();

        if (method_exists($store, 'flushLocks')) {
            $store->flushLocks();
        }
    }

    /**
     * Banco de destino da restauração.
     */
    protected function bancoDestino(): string
    {
        return (string) config('database.connections.'.config('escola.backup.conexao').'.database');
    }

    /**
     * Imprime o resumo da restauração concluída.
     */
    protected function resumo(string $diretorio): void
    {
        $this->table(['Item', 'Valor'], [
            ['Origem do backup', $diretorio],
            ['Banco restaurado', $this->bancoDestino()],
            ['Ambiente', app()->environment()],
            ['Uploads', count($this->arquivador->list($diretorio.'/uploads.tar.gz')).' entrada(s) extraída(s)'],
        ]);

        $this->info('Restauração concluída.');
    }
}
