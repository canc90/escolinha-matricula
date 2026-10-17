<?php

namespace Tests\Feature;

use App\Console\Commands\Backup;
use App\Contracts\DatabaseDumper;
use App\Contracts\FileArchiver;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\Feature\Concerns\UsaBackupDeTeste;
use Tests\TestCase;

/**
 * Comportamento do comando `escola:backup` (BACKUP-01 e BACKUP-02).
 *
 * O dump do MySQL é substituído por um dublê (não há MySQL utilizável na
 * suíte), mas o restante do artefato é real: gzip, tar e manifesto.
 */
class BackupCommandTest extends TestCase
{
    use LazilyRefreshDatabase;
    use UsaBackupDeTeste;

    public function test_o_backup_cria_dump_compactado_e_manifesto_integro(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        $this->artisan('escola:backup')->assertSuccessful();

        $diretorios = $this->diretoriosDeBackup($caminho);

        $this->assertCount(1, $diretorios);

        $diretorio = $diretorios[0];

        $this->assertStringStartsWith($caminho.'/backup-', $diretorio);
        $this->assertFileExists($diretorio.'/database.sql.gz');
        $this->assertFileExists($diretorio.'/uploads.tar.gz');
        $this->assertFileExists($diretorio.'/manifest.json');
        $this->assertFileDoesNotExist($diretorio.'/database.sql', 'O dump bruto não deve ficar no diretório.');

        // O conteúdo importa: um arquivo vazio com sha256 correto não é backup.
        $sql = $this->conteudoDescompactado($diretorio.'/database.sql.gz');

        $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS alunos_restore_teste', $sql);
        $this->assertStringContainsString('INSERT INTO alunos_restore_teste', $sql);

        $manifesto = json_decode((string) File::get($diretorio.'/manifest.json'), true);

        $this->assertSame(1, $manifesto['formato']);
        $this->assertSame(app()->environment(), $manifesto['ambiente']);
        $this->assertSame(
            hash_file('sha256', $diretorio.'/database.sql.gz'),
            $manifesto['artefatos']['banco']['sha256'],
        );
        $this->assertSame(
            hash_file('sha256', $diretorio.'/uploads.tar.gz'),
            $manifesto['artefatos']['uploads']['sha256'],
        );
    }

    public function test_o_backup_inclui_os_uploads_no_arquivo_e_no_manifesto(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('alunos/fotos/teste.jpg', 'conteudo-da-foto');

        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        $this->artisan('escola:backup')->assertSuccessful();

        $diretorio = $this->diretoriosDeBackup($caminho)[0];

        $this->assertContains('alunos/fotos/teste.jpg', $this->entradasDoTar($diretorio.'/uploads.tar.gz'));

        $manifesto = json_decode((string) File::get($diretorio.'/manifest.json'), true);

        $this->assertSame(filesize($diretorio.'/uploads.tar.gz'), $manifesto['artefatos']['uploads']['bytes']);
        $this->assertSame(
            hash_file('sha256', $diretorio.'/uploads.tar.gz'),
            $manifesto['artefatos']['uploads']['sha256'],
        );
    }

    public function test_falha_no_dump_nao_deixa_diretorio_pela_metade(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperQueFalha();

        $this->artisan('escola:backup')->assertFailed();

        // Sem manifesto escrito, o diretório da execução é descartado.
        $this->assertSame([], $this->diretoriosDeBackup($caminho));
    }

    public function test_falha_depois_do_manifesto_preserva_o_backup_completo(): void
    {
        Storage::fake('public');
        $caminho = $this->prepararDiretorioDeBackup();
        $this->dumperFalso();

        // A retenção é o passo que roda DEPOIS do manifesto: forçando a falha
        // dela, o comando não pode apagar o backup que acabou de ficar completo.
        $this->app->bind(Backup::class, fn () => new class(app(DatabaseDumper::class), app(FileArchiver::class)) extends Backup
        {
            protected function aplicarRetencao(int $retencaoDias): int
            {
                throw new RuntimeException('falha pós-manifesto simulada');
            }
        });

        $this->artisan('escola:backup')->assertFailed();

        $diretorios = $this->diretoriosDeBackup($caminho);

        $this->assertCount(1, $diretorios);
        $this->assertFileExists($diretorios[0].'/manifest.json');
        $this->assertFileExists($diretorios[0].'/database.sql.gz');
        $this->assertFileExists($diretorios[0].'/uploads.tar.gz');
    }
}
