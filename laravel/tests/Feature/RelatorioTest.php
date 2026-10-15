<?php

namespace Tests\Feature;

use App\Models\Aluno;
use App\Models\Turma;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RelatorioTest extends TestCase
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

    public function test_aluno_ficha_is_downloadable_as_pdf(): void
    {
        $aluno = Aluno::create(['nome' => 'Aluno Relatório']);

        $response = $this->actingAs($this->admin())->get(route('relatorios.aluno.pdf', $aluno));

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }

    public function test_turma_frequencia_is_downloadable_as_pdf(): void
    {
        $turma = Turma::create(['nome' => 'Turma A', 'turno' => 'Manhã']);
        Aluno::create(['nome' => 'Aluno Turma', 'turma_id' => $turma->id]);

        $response = $this->actingAs($this->admin())->get(route('relatorios.turma.pdf', $turma));

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }

    public function test_turma_frequencia_is_downloadable_as_csv(): void
    {
        $turma = Turma::create(['nome' => 'Turma B']);
        Aluno::create(['nome' => 'Aluna CSV', 'turma_id' => $turma->id]);

        $response = $this->actingAs($this->admin())->get(route('relatorios.turma.csv', $turma));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('content-type'));
        $this->assertStringContainsString('Aluna CSV', $response->content());
    }
}
