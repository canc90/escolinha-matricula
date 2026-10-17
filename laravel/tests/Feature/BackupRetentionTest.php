<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
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

    public function test_retencao_negativa_e_recusada_sem_criar_backup(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        $this->artisan('escola:backup', ['--retention-days' => -1])->assertFailed();

        $this->assertSame([], $this->diretoriosDeBackup($caminho));
    }
}
