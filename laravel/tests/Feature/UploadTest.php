<?php

namespace Tests\Feature;

use App\Livewire\Alunos\AlunoForm;
use App\Models\Aluno;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class UploadTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'usuario' => 'admin',
            'name' => 'Administrador',
            'password' => 'secret123',
            'role' => 'admin',
        ]);
    }

    public function test_aluno_photo_and_document_are_stored(): void
    {
        Storage::fake('public');
        $admin = $this->admin();

        Livewire::actingAs($admin)
            ->test(AlunoForm::class)
            ->set('data.nome', 'Aluno com Foto')
            ->set('foto', UploadedFile::fake()->image('retrato.jpg', 600, 600))
            ->set('documento', UploadedFile::fake()->create('documento.pdf', 100, 'application/pdf'))
            ->call('salvar')
            ->assertHasNoErrors();

        $aluno = Aluno::where('nome', 'Aluno com Foto')->firstOrFail();

        $this->assertNotNull($aluno->foto);
        $this->assertStringEndsWith('.jpg', $aluno->foto);
        Storage::disk('public')->assertExists($aluno->foto);

        $this->assertNotNull($aluno->foto_documento);
        Storage::disk('public')->assertExists($aluno->foto_documento);
    }

    public function test_photo_must_be_an_image(): void
    {
        Storage::fake('public');
        $admin = $this->admin();

        Livewire::actingAs($admin)
            ->test(AlunoForm::class)
            ->set('data.nome', 'Aluno Inválido')
            ->set('foto', UploadedFile::fake()->create('arquivo.txt', 10, 'text/plain'))
            ->call('salvar')
            ->assertHasErrors('foto');

        $this->assertDatabaseMissing('alunos', ['nome' => 'Aluno Inválido']);
    }

    public function test_replacing_photo_removes_the_previous_file(): void
    {
        Storage::fake('public');
        $admin = $this->admin();

        Storage::disk('public')->put('alunos/fotos/antiga.jpg', 'conteudo');
        $aluno = Aluno::create(['nome' => 'Aluno Existente', 'foto' => 'alunos/fotos/antiga.jpg']);

        Livewire::actingAs($admin)
            ->test(AlunoForm::class, ['aluno' => $aluno])
            ->set('foto', UploadedFile::fake()->image('nova.jpg', 500, 500))
            ->call('salvar')
            ->assertHasNoErrors();

        $aluno->refresh();

        $this->assertNotSame('alunos/fotos/antiga.jpg', $aluno->foto);
        Storage::disk('public')->assertMissing('alunos/fotos/antiga.jpg');
        Storage::disk('public')->assertExists($aluno->foto);
    }
}
