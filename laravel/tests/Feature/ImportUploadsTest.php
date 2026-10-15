<?php

namespace Tests\Feature;

use App\Models\Aluno;
use App\Models\Professora;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImportUploadsTest extends TestCase
{
    use RefreshDatabase;

    private string $source;

    protected function setUp(): void
    {
        parent::setUp();

        $this->source = storage_path('framework/testing/import-uploads');
        File::ensureDirectoryExists($this->source);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->source);

        parent::tearDown();
    }

    public function test_it_imports_legacy_photo_and_rewrites_the_path(): void
    {
        Storage::fake('public');
        UploadedFile::fake()->image('legada.jpg', 300, 300)->move($this->source, 'legada.jpg');

        $aluno = Aluno::create(['nome' => 'Aluno Legado', 'foto' => '/uploads/fotos/legada.jpg']);

        $this->artisan('escola:import-uploads', ['--source' => $this->source])->assertSuccessful();

        $aluno->refresh();

        $this->assertNotSame('/uploads/fotos/legada.jpg', $aluno->foto);
        $this->assertStringStartsWith('alunos/fotos/', $aluno->foto);
        $this->assertStringEndsWith('.jpg', $aluno->foto);
        Storage::disk('public')->assertExists($aluno->foto);
    }

    public function test_it_keeps_the_record_when_the_legacy_file_is_missing(): void
    {
        Storage::fake('public');

        $professora = Professora::create([
            'nome' => 'Professora Ausente',
            'foto' => '/uploads/fotos/inexistente.jpg',
        ]);

        $this->artisan('escola:import-uploads', ['--source' => $this->source])->assertSuccessful();

        $this->assertSame('/uploads/fotos/inexistente.jpg', $professora->fresh()->foto);
    }

    public function test_it_skips_paths_that_are_not_legacy(): void
    {
        Storage::fake('public');

        $aluno = Aluno::create(['nome' => 'Aluno Atual', 'foto' => 'alunos/fotos/atual.jpg']);

        $this->artisan('escola:import-uploads', ['--source' => $this->source])->assertSuccessful();

        $this->assertSame('alunos/fotos/atual.jpg', $aluno->fresh()->foto);
    }
}
