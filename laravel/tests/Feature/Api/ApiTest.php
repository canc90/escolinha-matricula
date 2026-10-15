<?php

namespace Tests\Feature\Api;

use App\Models\Aluno;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'admin'): User
    {
        return User::create([
            'usuario' => $role === 'admin' ? 'admin' : 'prof1',
            'name' => 'Usuário '.$role,
            'password' => 'secret123',
            'role' => $role,
        ]);
    }

    public function test_login_issues_a_token(): void
    {
        $this->user();

        $this->postJson('/api/v1/login', [
            'usuario' => 'admin',
            'senha' => 'secret123',
            'device_name' => 'teste',
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'usuario', 'role']]);

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        $this->user();

        $this->postJson('/api/v1/login', [
            'usuario' => 'admin',
            'senha' => 'errada',
            'device_name' => 'teste',
        ])->assertStatus(422)->assertJsonValidationErrors('usuario');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_logout_revokes_the_token(): void
    {
        $user = $this->user();
        $token = $user->createToken('teste')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_alunos_index_is_paginated(): void
    {
        Sanctum::actingAs($this->user());
        Aluno::create(['nome' => 'Ana']);
        Aluno::create(['nome' => 'Bruno']);

        $this->getJson('/api/v1/alunos')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'nome']], 'meta' => ['total']]);
    }

    public function test_admin_can_create_an_aluno(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/v1/alunos', ['nome' => 'Novo Aluno'])
            ->assertCreated()
            ->assertJsonPath('data.nome', 'Novo Aluno');

        $this->assertDatabaseHas('alunos', ['nome' => 'Novo Aluno']);
    }

    public function test_professora_cannot_create_an_aluno(): void
    {
        Sanctum::actingAs($this->user('professora'));

        $this->postJson('/api/v1/alunos', ['nome' => 'Não Permitido'])
            ->assertForbidden();

        $this->assertDatabaseMissing('alunos', ['nome' => 'Não Permitido']);
    }

    public function test_dashboard_returns_indicators(): void
    {
        Sanctum::actingAs($this->user());

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'total_alunos', 'total_professoras', 'total_turmas',
                'presencas_hoje', 'registros_hoje', 'percentual_hoje',
            ]);
    }
}
