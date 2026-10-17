<?php

namespace App\Console\Commands;

use App\Contracts\DatabaseDumper;
use App\Contracts\FileArchiver;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Gera o backup diário do banco de dados e dos uploads em um diretório próprio,
 * com manifesto de integridade (sha256) gravado por último como marcador de
 * conclusão, e aplica a retenção configurada.
 */
class Backup extends Command
{
    protected $signature = 'escola:backup
                            {--retention-days= : Sobrescreve a retenção configurada, em dias}';

    protected $description = 'Gera o backup diário do banco de dados e dos uploads.';

    /**
     * Diretório do backup desta execução — nunca é tocado pela poda.
     */
    private ?string $diretorioDaExecucao = null;

    public function __construct(
        private DatabaseDumper $dumper,
        private FileArchiver $arquivador,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        // Valida a retenção ANTES de criar qualquer diretório. Zero é recusado:
        // "manter nada" apagaria o backup que esta execução acabou de criar.
        $retencaoDias = (int) ($this->option('retention-days') ?? config('escola.backup.retencao_dias'));

        if ($retencaoDias < 1) {
            $this->error('A retenção em dias precisa ser pelo menos 1 (recebido: '.$retencaoDias.').');

            return self::FAILURE;
        }

        $lock = Cache::lock('escola:backup', 600);

        if (! $lock->get()) {
            $this->warn('Já existe um backup em execução. Nada foi feito.');

            return self::FAILURE;
        }

        $diretorio = null;

        try {
            $diretorio = $this->criarDiretorio();
            $this->diretorioDaExecucao = $diretorio;
            $this->dumpDoBanco($diretorio);
            $this->compactar($diretorio.'/database.sql', $diretorio.'/database.sql.gz');
            $this->arquivarUploads($diretorio);
            $this->escreverManifesto($diretorio, (string) ($this->conexao()['database'] ?? ''));
        } catch (Throwable $e) {
            $this->error('Falha ao gerar o backup: '.$e->getMessage());

            $this->descartarDiretorioIncompleto($diretorio);

            return self::FAILURE;
        } finally {
            $lock->release();
        }

        // A retenção roda FORA do try/catch do backup: uma falha aqui nunca pode
        // apagar o backup que acabou de ser criado.
        try {
            $this->aplicarRetencao($retencaoDias);
        } catch (Throwable $e) {
            $this->error('Backup gerado, mas a retenção falhou: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->resumo($diretorio);

        return self::SUCCESS;
    }

    /**
     * Resolve o diretório de destino e cria um subdiretório com a data da execução.
     *
     * Visibilidade protected (e não private) porque o plano 01-02 substitui
     * métodos numa subclasse de teste.
     */
    protected function criarDiretorio(): string
    {
        // Sem a barra final: com ela, o caminho deste diretório sairia como
        // ".../backups//backup-X" enquanto a listagem da poda devolve
        // ".../backups/backup-X", e a proteção do backup corrente não casaria.
        $base = rtrim((string) config('escola.backup.caminho'), '/\\');

        if ($base === '') {
            $base = (string) config('escola.backup.caminho');
        }

        File::ensureDirectoryExists($base, 0750);

        $diretorio = $base.'/backup-'.now()->format('Y-m-d_His');

        File::ensureDirectoryExists($diretorio, 0750);

        // Duas execuções no mesmo segundo — caso que o lock de 600 s não cobre:
        // invalida o marcador de conclusão de uma execução anterior para que o
        // `catch` não preserve um diretório que esta execução pode deixar incompleto.
        if (File::exists($diretorio.'/manifest.json')) {
            File::delete($diretorio.'/manifest.json');
        }

        return $diretorio;
    }

    /**
     * Devolve a conexão de banco usada pelo backup.
     *
     * @return array<string, mixed>
     */
    protected function conexao(): array
    {
        return (array) config('database.connections.'.config('escola.backup.conexao'));
    }

    /**
     * Gera o dump bruto do banco dentro do diretório do backup.
     */
    protected function dumpDoBanco(string $diretorio): void
    {
        $this->dumper->dump($diretorio.'/database.sql');
    }

    /**
     * Compacta o dump em gzip (em blocos, sem carregar o arquivo na memória) e
     * remove o arquivo bruto.
     */
    protected function compactar(string $sql, string $gz): void
    {
        $entrada = fopen($sql, 'rb');
        $saida = gzopen($gz, 'wb9');

        if ($entrada === false || $saida === false) {
            throw new RuntimeException('Não foi possível abrir os arquivos para compactar o dump.');
        }

        try {
            while (! feof($entrada)) {
                $bloco = fread($entrada, 1024 * 1024);

                if ($bloco === false) {
                    throw new RuntimeException('Falha ao ler o dump para compactação.');
                }

                gzwrite($saida, $bloco);
            }
        } finally {
            fclose($entrada);
            gzclose($saida);
        }

        File::delete($sql);
    }

    /**
     * Compacta o disco `public` (fotos e documentos) dentro do backup.
     */
    protected function arquivarUploads(string $diretorio): void
    {
        $raiz = Storage::disk('public')->path('');

        File::ensureDirectoryExists($raiz);

        $this->arquivador->create($raiz, $diretorio.'/uploads.tar.gz');
    }

    /**
     * Grava o manifesto do backup POR ÚLTIMO: sua existência marca uma execução
     * concluída e é o que o comando de restauração exige.
     */
    protected function escreverManifesto(string $diretorio, string $banco): void
    {
        $manifesto = [
            'formato' => 1,
            'gerado_em' => now()->toIso8601String(),
            'aplicacao' => config('app.name'),
            'ambiente' => app()->environment(),
            'conexao' => config('escola.backup.conexao'),
            'banco' => $banco,
            'retencao_dias' => (int) config('escola.backup.retencao_dias'),
            'artefatos' => [
                'banco' => $this->descrever($diretorio.'/database.sql.gz', 'database.sql.gz'),
                'uploads' => $this->descrever($diretorio.'/uploads.tar.gz', 'uploads.tar.gz'),
            ],
        ];

        File::put(
            $diretorio.'/manifest.json',
            (string) json_encode($manifesto, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }

    /**
     * Descreve um artefato do backup (nome, tamanho e sha256).
     *
     * @return array{arquivo: string, bytes: int, sha256: string}
     */
    protected function descrever(string $caminho, string $nome): array
    {
        return [
            'arquivo' => $nome,
            'bytes' => (int) filesize($caminho),
            'sha256' => (string) hash_file('sha256', $caminho),
        ];
    }

    /**
     * Remove os backups mais antigos que a retenção, ignorando nomes fora do
     * padrão e datas impossíveis, e tolerando falhas por diretório.
     */
    protected function aplicarRetencao(int $retencaoDias): int
    {
        $base = (string) config('escola.backup.caminho');

        if (! File::isDirectory($base)) {
            return 0;
        }

        $limite = now()->subDays($retencaoDias);
        $removidos = 0;
        $ignorados = 0;
        $orfaos = 0;

        foreach (File::directories($base) as $diretorio) {
            $nome = basename($diretorio);

            // A poda nunca toca no backup desta execução: mesmo com relógio
            // adiantado/atrasado entre a criação e a poda, o backup do dia é
            // intocável. A comparação normaliza as barras dos dois lados.
            if (rtrim($diretorio, '/\\') === rtrim((string) $this->diretorioDaExecucao, '/\\')) {
                continue;
            }

            if (! preg_match('/^backup-(\d{4})-(\d{2})-(\d{2})_(\d{6})$/', $nome, $m)) {
                $ignorados++;

                continue;
            }

            // Carbon::createFromFormat faz rollover silencioso para datas
            // impossíveis (2020-13-45 -> 2021-02-14), o que faria um nome
            // inválido ser apagado como se fosse um backup antigo.
            if (! checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                $ignorados++;

                continue;
            }

            $data = Carbon::create(
                (int) $m[1],
                (int) $m[2],
                (int) $m[3],
                (int) substr($m[4], 0, 2),
                (int) substr($m[4], 2, 2),
                (int) substr($m[4], 4, 2),
            );

            if ($data->greaterThanOrEqualTo($limite)) {
                continue;
            }

            try {
                File::deleteDirectory($diretorio);
                $removidos++;
            } catch (Throwable $e) {
                // Ex.: diretório criado por outro usuário (root em produção,
                // www-data no scheduler). Nunca propaga: isso apagaria o backup
                // recém-criado pelo catch do comando.
                $orfaos++;
                $this->warn("Não foi possível remover o backup antigo {$nome}: {$e->getMessage()}");
            }
        }

        if ($ignorados > 0 || $orfaos > 0) {
            $this->line("Retenção: {$removidos} removido(s), {$ignorados} ignorado(s), {$orfaos} órfão(s).");
        }

        return $removidos;
    }

    /**
     * Apaga o diretório da execução corrente, mas SOMENTE quando ele não tem
     * manifesto: um diretório com manifesto é um backup completo e válido.
     */
    protected function descartarDiretorioIncompleto(?string $diretorio): void
    {
        if ($diretorio === null || ! File::isDirectory($diretorio)) {
            return;
        }

        if (File::exists($diretorio.'/manifest.json')) {
            return;
        }

        File::deleteDirectory($diretorio);
    }

    /**
     * Imprime o resumo do backup gerado.
     */
    protected function resumo(string $diretorio): void
    {
        $this->table(
            ['Backup', 'Conteúdo', 'Tamanho'],
            [
                [
                    $diretorio,
                    'database.sql.gz',
                    number_format(((int) filesize($diretorio.'/database.sql.gz')) / 1048576, 2, ',', '.').' MB',
                ],
                [
                    '',
                    'uploads.tar.gz',
                    number_format(((int) filesize($diretorio.'/uploads.tar.gz')) / 1048576, 2, ',', '.').' MB',
                ],
            ]
        );
    }
}
