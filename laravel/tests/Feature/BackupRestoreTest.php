<?php

namespace Tests\Feature;

use App\Contracts\DatabaseRestorer;
use App\Services\Backup\MysqlClientRestorer;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PDO;
use Symfony\Component\Process\Process;
use Tests\Feature\Concerns\UsaBackupDeTeste;
use Tests\TestCase;
use Throwable;

/**
 * Guardas e comportamento do comando `escola:restore-backup` (BACKUP-03).
 *
 * O artefato do backup é REAL (gzip, tar e manifesto gerados pelo comando), e o
 * que é substituído é apenas o aplicador de SQL: em vez do binário `mysql`, um
 * dublê aplica o mesmo SQL no SQLite em memória. Assim as guardas e todo o
 * fluxo de validação/descompressão/extração são exercitados sem MySQL.
 */
class BackupRestoreTest extends TestCase
{
    use LazilyRefreshDatabase;
    use UsaBackupDeTeste;

    /**
     * Restaurador dublê do teste (uma instância por teste, ver restauradorFalso()).
     */
    private ?object $restauradorConversa = null;

    public function test_restaura_banco_e_uploads_com_force(): void
    {
        $this->criarBackup();
        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup', ['--force' => true])->assertSuccessful();

        $this->assertTrue($restaurador->aplicou, 'O SQL do backup não foi aplicado.');
        $this->assertTrue(Schema::hasTable('alunos_restore_teste'));
        $this->assertSame(1, DB::table('alunos_restore_teste')->count());
        Storage::disk('public')->assertExists('alunos/fotos/foto.jpg');
    }

    public function test_aceita_file_com_o_nome_do_diretorio_de_backup(): void
    {
        $diretorio = $this->criarBackup();
        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup', [
            '--file' => basename($diretorio),
            '--force' => true,
        ])->assertSuccessful();

        $this->assertTrue($restaurador->aplicou);
        $this->assertTrue(Schema::hasTable('alunos_restore_teste'));
    }

    public function test_em_producao_sem_force_recusa_e_nao_escreve(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        $this->criarBackup(); // manifesto coerente (ambiente=production)
        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup')
            ->expectsOutputToContain('obrigatório passar --force')
            ->assertFailed();

        $this->assertFalse($restaurador->aplicou);
        $this->assertFalse(Schema::hasTable('alunos_restore_teste'));
        Storage::disk('public')->assertMissing('alunos/fotos/foto.jpg');
    }

    public function test_em_producao_com_force_restaura(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        $this->criarBackup();
        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup', ['--force' => true])->assertSuccessful();

        $this->assertTrue($restaurador->aplicou);
        $this->assertTrue(Schema::hasTable('alunos_restore_teste'));
    }

    public function test_backup_sem_manifesto_e_recusado(): void
    {
        $diretorio = $this->criarBackup();

        File::delete($diretorio.'/manifest.json');

        $this->assertRecusado();
    }

    public function test_artefato_invalido_e_recusado_nos_quatro_casos(): void
    {
        // (a) sha256 do dump divergente do manifesto
        $diretorio = $this->criarBackup();
        File::append($diretorio.'/database.sql.gz', 'conteudo estranho');
        $this->assertRecusado();

        // (b) manifesto sem artefatos.uploads.sha256
        $diretorio = $this->criarBackup();
        $this->reescreverManifesto(
            $diretorio,
            fn (array $manifesto): array => array_merge($manifesto, [
                'artefatos' => ['banco' => $manifesto['artefatos']['banco']],
            ]),
        );
        $this->assertRecusado();

        // (c) formato ausente
        $diretorio = $this->criarBackup();
        $this->reescreverManifesto($diretorio, function (array $manifesto): array {
            unset($manifesto['formato']);

            return $manifesto;
        });
        $this->assertRecusado();

        // (d) formato não suportado
        $diretorio = $this->criarBackup();
        $this->reescreverManifesto($diretorio, fn (array $manifesto): array => array_merge($manifesto, ['formato' => 2]));
        $this->assertRecusado();
    }

    public function test_arquivo_inexistente_fora_do_diretorio_e_irmao_de_prefixo_comum_sao_recusados(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();
        $this->artisan('escola:backup')->assertSuccessful();

        // Irmão com prefixo textual comum ao nome "backups": sem o separador
        // final na comparação de contenção, ele passaria na checagem.
        $irmao = dirname($caminho).'/backups-evil';
        File::ensureDirectoryExists($irmao.'/backup-2020-01-01_000000');
        File::put($irmao.'/backup-2020-01-01_000000/manifest.json', '{}');

        $this->assertRecusadoComFile('nao-existe');
        $this->assertRecusadoComFile($irmao);
        $this->assertRecusadoComFile($irmao.'/backup-2020-01-01_000000');
    }

    public function test_tar_com_caminho_malicioso_e_recusado_mesmo_com_hash_correto(): void
    {
        $diretorio = $this->criarBackup();

        $this->substituirUploadsPorTarMalicioso($diretorio);

        $restaurador = $this->restauradorFalso();

        // O sha256 do manifesto foi recalculado: a recusa provada aqui é a do
        // caminho malicioso, não a de integridade.
        $this->artisan('escola:restore-backup', ['--force' => true])
            ->expectsOutputToContain('caminho inválido')
            ->assertFailed();

        $this->assertFalse($restaurador->aplicou);
        Storage::disk('public')->assertMissing('alunos/fotos/foto.jpg');
        Storage::disk('public')->assertMissing('malicioso.jpg');
    }

    public function test_dry_run_mostra_o_plano_sem_escrever(): void
    {
        $this->criarBackup();
        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup', ['--dry-run' => true])
            ->expectsOutputToContain('plano (--dry-run)')
            ->assertSuccessful();

        $this->assertFalse($restaurador->aplicou);
        $this->assertFalse(Schema::hasTable('alunos_restore_teste'));
        Storage::disk('public')->assertMissing('alunos/fotos/foto.jpg');
    }

    public function test_manifesto_de_outro_ambiente_e_recusado_sem_force(): void
    {
        $diretorio = $this->criarBackup();
        $this->reescreverManifesto($diretorio, fn (array $manifesto): array => array_merge($manifesto, ['ambiente' => 'production']));

        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup')
            ->expectsOutputToContain('ambiente do backup=production / ambiente atual=testing')
            ->assertFailed();

        $this->assertFalse($restaurador->aplicou);
        $this->assertFalse(Schema::hasTable('alunos_restore_teste'));
    }

    public function test_manifesto_de_outro_banco_e_recusado_sem_force_e_aceito_com_force(): void
    {
        $diretorio = $this->criarBackup();
        $this->reescreverManifesto($diretorio, fn (array $manifesto): array => array_merge($manifesto, ['banco' => 'outro_banco']));

        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup')
            ->expectsOutputToContain('banco do backup=outro_banco / banco atual='.$this->bancoDestinoDoTeste())
            ->assertFailed();

        $this->assertFalse($restaurador->aplicou);

        // A confirmação destrutiva explícita cobre o caso: com --force prossegue.
        $diretorio = $this->criarBackup();
        $this->reescreverManifesto($diretorio, fn (array $manifesto): array => array_merge($manifesto, ['banco' => 'outro_banco']));

        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup', ['--force' => true])->assertSuccessful();

        $this->assertTrue($restaurador->aplicou);
    }

    public function test_dry_run_com_manifesto_divergente_avisa_sem_escrever(): void
    {
        $diretorio = $this->criarBackup();
        $this->reescreverManifesto($diretorio, fn (array $manifesto): array => array_merge($manifesto, ['ambiente' => 'production']));

        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup', ['--dry-run' => true])
            ->expectsOutputToContain('divergência: seria recusada sem --force')
            ->expectsOutputToContain('ambiente do backup=production / ambiente atual=testing')
            ->assertSuccessful();

        $this->assertFalse($restaurador->aplicou);
        $this->assertFalse(Schema::hasTable('alunos_restore_teste'));
        Storage::disk('public')->assertMissing('alunos/fotos/foto.jpg');
    }

    public function test_restaurador_real_aplica_o_sql_no_mysql_quando_ha_banco(): void
    {
        // A suíte roda com DB_DATABASE=:memory:, então a conexão `mysql` existe
        // mas não aponta para um banco utilizável: o teste se auto-pula em vez de
        // passar em silêncio. Para exercitá-lo de verdade, aponte o banco alvo
        // sem mexer no DB_DATABASE da suíte:
        //   docker compose exec -e ESCOLA_TEST_MYSQL_DATABASE=escola app php artisan test --filter=BackupRestoreTest
        $conexao = (array) config('database.connections.mysql');

        $alvo = env('ESCOLA_TEST_MYSQL_DATABASE');

        if (is_string($alvo) && $alvo !== '') {
            $conexao['database'] = $alvo;
        }

        try {
            $pdo = new PDO(
                sprintf('mysql:host=%s;port=%s;dbname=%s', $conexao['host'], $conexao['port'], $conexao['database']),
                (string) $conexao['username'],
                (string) $conexao['password'],
                [PDO::ATTR_TIMEOUT => 2, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
            );
        } catch (Throwable) {
            $this->markTestSkipped('Sem banco MySQL acessível: teste de integração do restaurador ignorado.');
        }

        $sql = storage_path('framework/testing/restaurador-'.Str::random(8).'.sql');

        File::put($sql, "DROP TABLE IF EXISTS restore_integracao_teste;\n"
            ."CREATE TABLE restore_integracao_teste (id INT PRIMARY KEY, nome VARCHAR(50));\n"
            ."INSERT INTO restore_integracao_teste (id, nome) VALUES (1, 'integracao');\n");

        try {
            (new MysqlClientRestorer($conexao, (string) config('escola.backup.binarios.mysql')))->restore($sql);

            $this->assertSame(
                1,
                (int) $pdo->query("SELECT COUNT(*) FROM restore_integracao_teste WHERE nome = 'integracao'")->fetchColumn(),
            );
        } finally {
            $pdo->exec('DROP TABLE IF EXISTS restore_integracao_teste');

            File::delete($sql);
        }
    }

    /**
     * Monta um backup real (dumper dublê, gzip/tar/manifesto reais) e apaga o
     * arquivo de uploads do disco: assim "extraiu" e "não extraiu" ficam
     * verificáveis pela presença de alunos/fotos/foto.jpg.
     */
    protected function criarBackup(?string $sql = null): string
    {
        // O binding do restaurador precisa existir ANTES da primeira chamada
        // artisan do teste: o kernel de console instancia os comandos no
        // bootstrap, e um bind posterior não alcança o comando já resolvido.
        $this->restauradorFalso();

        Storage::fake('public');
        Storage::disk('public')->put('alunos/fotos/foto.jpg', 'conteudo-da-foto');

        $caminho = $this->prepararDiretorioDeBackup();

        $this->dumperFalso($sql);

        $this->artisan('escola:backup')->assertSuccessful();

        Storage::disk('public')->delete('alunos/fotos/foto.jpg');

        return $this->diretoriosDeBackup($caminho)[0];
    }

    /**
     * Registra um restaurador de mentira que aplica o SQL no banco de teste.
     *
     * Devolve sempre a MESMA instância: o comando é resolvido uma única vez por
     * teste, então é essa instância que recebe as chamadas e é observada.
     */
    protected function restauradorFalso(): object
    {
        if ($this->restauradorConversa !== null) {
            return $this->restauradorConversa;
        }

        $restaurador = new class implements DatabaseRestorer
        {
            public ?string $caminho = null;

            public bool $aplicou = false;

            public function restore(string $sqlFilePath): void
            {
                $this->caminho = $sqlFilePath;

                foreach (array_filter(array_map('trim', explode(';', (string) file_get_contents($sqlFilePath)))) as $comando) {
                    DB::unprepared($comando);
                }

                $this->aplicou = true;
            }
        };

        $this->app->bind(DatabaseRestorer::class, fn () => $restaurador);

        return $this->restauradorConversa = $restaurador;
    }

    /**
     * Recusa esperada: comando falha, nada é aplicado no banco nem nos uploads.
     */
    protected function assertRecusado(): void
    {
        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup', ['--force' => true])->assertFailed();

        $this->assertFalse($restaurador->aplicou);
        $this->assertFalse(Schema::hasTable('alunos_restore_teste'));
        Storage::disk('public')->assertMissing('alunos/fotos/foto.jpg');
    }

    /**
     * Recusa esperada para um valor de --file.
     */
    protected function assertRecusadoComFile(string $valor): void
    {
        $restaurador = $this->restauradorFalso();

        $this->artisan('escola:restore-backup', ['--file' => $valor, '--force' => true])->assertFailed();

        $this->assertFalse($restaurador->aplicou, "O arquivo '{$valor}' não deveria ter sido restaurado.");
        $this->assertFalse(Schema::hasTable('alunos_restore_teste'));
    }

    /**
     * Reescreve o manifesto do artefato (o hash dos arquivos não é do manifesto).
     *
     * @param  callable(array<string, mixed>): array<string, mixed>  $mutacao
     */
    protected function reescreverManifesto(string $diretorio, callable $mutacao): void
    {
        $caminho = $diretorio.'/manifest.json';

        $manifesto = $mutacao((array) json_decode((string) File::get($caminho), true));

        File::put($caminho, (string) json_encode($manifesto, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    /**
     * Troca o uploads.tar.gz por um arquivo com entradas "../" e recalcula o
     * sha256 no manifesto.
     */
    protected function substituirUploadsPorTarMalicioso(string $diretorio): void
    {
        $origem = storage_path('framework/testing/'.Str::random(8));

        File::ensureDirectoryExists($origem.'/alunos/fotos');
        File::put($origem.'/alunos/fotos/malicioso.jpg', 'x');

        $processo = new Process(['tar', '-czf', $diretorio.'/uploads.tar.gz', '-C', $origem, '--transform=s|^|../|', '.']);
        $processo->setTimeout(60);
        $processo->run();

        File::deleteDirectory($origem);

        $this->assertTrue($processo->isSuccessful(), 'Não foi possível montar o tar malicioso: '.$processo->getErrorOutput());

        $this->reescreverManifesto($diretorio, fn (array $manifesto): array => array_merge($manifesto, [
            'artefatos' => array_merge($manifesto['artefatos'], [
                'uploads' => [
                    'arquivo' => 'uploads.tar.gz',
                    'bytes' => (int) filesize($diretorio.'/uploads.tar.gz'),
                    'sha256' => (string) hash_file('sha256', $diretorio.'/uploads.tar.gz'),
                ],
            ]),
        ]));
    }
}
