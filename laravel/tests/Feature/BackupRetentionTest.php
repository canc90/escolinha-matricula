<?php

namespace Tests\Feature;

use App\Console\Commands\Backup;
use App\Contracts\DatabaseDumper;
use App\Contracts\FileArchiver;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\UsaBackupDeTeste;
use Tests\TestCase;

/**
 * Retenção de backups: poda o que é antigo, preserva o que não é reconhecível e
 * nunca derruba o backup do dia (BACKUP-01).
 */
class BackupRetentionTest extends TestCase
{
    use LazilyRefreshDatabase;
    use UsaBackupDeTeste;

    public function test_a_retencao_remove_os_antigos_e_preserva_o_backup_novo(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        foreach (['backup-2020-01-01_000000', 'backup-2024-01-01_000000', 'backup-2020-13-45_000000', 'nao-e-backup'] as $nome) {
            File::ensureDirectoryExists($caminho.'/'.$nome);
            File::put($caminho.'/'.$nome.'/qualquer.txt', 'x');
        }

        $this->artisan('escola:backup', ['--retention-days' => 1])->assertSuccessful();

        $this->assertDirectoryDoesNotExist($caminho.'/backup-2020-01-01_000000');
        $this->assertDirectoryDoesNotExist($caminho.'/backup-2024-01-01_000000');

        // Data impossível (checkdate() falso) e nome fora do padrão nunca são
        // apagados: a poda só age sobre o que reconhece como backup seu.
        $this->assertDirectoryExists($caminho.'/backup-2020-13-45_000000');
        $this->assertDirectoryExists($caminho.'/nao-e-backup');

        $novos = array_values(array_filter(
            $this->diretoriosDeBackup($caminho),
            fn (string $diretorio): bool => File::exists($diretorio.'/manifest.json'),
        ));

        $this->assertCount(1, $novos, 'O backup recém-criado não pode ser podado.');
    }

    public function test_a_retencao_usa_a_configuracao_quando_a_opcao_nao_e_informada(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        config(['escola.backup.retencao_dias' => 1]);

        File::ensureDirectoryExists($caminho.'/backup-2020-01-01_000000');
        File::put($caminho.'/backup-2020-01-01_000000/qualquer.txt', 'x');

        $this->artisan('escola:backup')->assertSuccessful();

        $this->assertDirectoryDoesNotExist($caminho.'/backup-2020-01-01_000000');
    }

    public function test_a_opcao_de_retencao_sobrepoe_a_configuracao(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        config(['escola.backup.retencao_dias' => 100000]);

        File::ensureDirectoryExists($caminho.'/backup-2020-01-01_000000');
        File::put($caminho.'/backup-2020-01-01_000000/qualquer.txt', 'x');

        $this->artisan('escola:backup', ['--retention-days' => 1])->assertSuccessful();

        $this->assertDirectoryDoesNotExist($caminho.'/backup-2020-01-01_000000');
    }

    public function test_retencao_zero_ou_negativa_e_recusada_sem_criar_backup(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        // Zero é recusado: "manter nada" apagaria o backup desta execução.
        foreach ([0, -1] as $dias) {
            $this->artisan('escola:backup', ['--retention-days' => $dias])->assertFailed();

            $this->assertSame([], $this->diretoriosDeBackup($caminho));
        }
    }

    public function test_a_poda_nunca_remove_o_backup_da_execucao_corrente(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        // A retenção roda com o relógio 2 dias adiante: sem a proteção, o backup
        // desta execução cairia fora da janela e seria apagado junto.
        $this->app->bind(Backup::class, fn () => new class(app(DatabaseDumper::class), app(FileArchiver::class)) extends Backup
        {
            protected function aplicarRetencao(int $retencaoDias): int
            {
                Carbon::setTestNow(now()->addDays(2));

                try {
                    return parent::aplicarRetencao($retencaoDias);
                } finally {
                    Carbon::setTestNow();
                }
            }
        });

        File::ensureDirectoryExists($caminho.'/backup-2020-01-01_000000');
        File::put($caminho.'/backup-2020-01-01_000000/qualquer.txt', 'x');

        $this->artisan('escola:backup', ['--retention-days' => 1])->assertSuccessful();

        $novos = array_values(array_filter(
            $this->diretoriosDeBackup($caminho),
            fn (string $diretorio): bool => File::exists($diretorio.'/manifest.json'),
        ));

        $this->assertCount(1, $novos, 'O backup desta execução não pode ser podado.');
        $this->assertDirectoryDoesNotExist($caminho.'/backup-2020-01-01_000000');
    }

    public function test_a_poda_protege_o_backup_corrente_mesmo_com_barra_final_no_caminho(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        // `BACKUP_PATH` configurado com barra final: sem a normalização, o
        // diretório da execução sairia como ".../backups//backup-X" e não casaria
        // com o caminho que a poda lista.
        config(['escola.backup.caminho' => $caminho.'/']);

        $this->app->bind(Backup::class, fn () => new class(app(DatabaseDumper::class), app(FileArchiver::class)) extends Backup
        {
            protected function aplicarRetencao(int $retencaoDias): int
            {
                Carbon::setTestNow(now()->addDays(2));

                try {
                    return parent::aplicarRetencao($retencaoDias);
                } finally {
                    Carbon::setTestNow();
                }
            }
        });

        $this->artisan('escola:backup', ['--retention-days' => 1])->assertSuccessful();

        $novos = array_values(array_filter(
            $this->diretoriosDeBackup($caminho),
            fn (string $diretorio): bool => File::exists($diretorio.'/manifest.json'),
        ));

        $this->assertCount(1, $novos, 'O backup desta execução não pode ser podado.');
    }
}
