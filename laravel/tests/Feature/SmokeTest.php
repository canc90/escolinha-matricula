<?php

namespace Tests\Feature;

use App\Livewire\Alunos\AlunoForm;
use App\Livewire\Auth\Login;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SmokeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin', 'web');
        Role::findOrCreate('professora', 'web');
    }

    private function admin(): User
    {
        $user = User::create([
            'usuario' => 'admin',
            'name' => 'Administrador',
            'password' => 'secret123',
            'role' => 'admin',
        ]);
        $user->assignRole('admin');

        return $user;
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_login_page_renders(): void
    {
        $this->get('/login')->assertOk()->assertSee('Sistema de Gestão Escolar');
    }

    public function test_admin_can_open_all_pages(): void
    {
        $admin = $this->admin();

        $urls = [
            '/dashboard', '/alunos', '/alunos/novo', '/professoras', '/professoras/nova',
            '/turmas', '/turmas/nova', '/diario', '/frequencias', '/direcao',
            '/ia-educacional', '/importacao', '/users', '/users/novo', '/dashboard-pedagogico',
        ];

        foreach ($urls as $url) {
            $this->actingAs($admin)->get($url)->assertOk();
        }
    }

    public function test_professora_cannot_open_admin_pages(): void
    {
        $user = User::create([
            'usuario' => 'prof1',
            'name' => 'Professora Teste',
            'password' => 'secret123',
            'role' => 'professora',
        ]);
        $user->assignRole('professora');

        $this->actingAs($user)->get('/direcao')->assertForbidden();
        $this->actingAs($user)->get('/dashboard-professora')->assertOk();
    }

    public function test_login_authenticates_valid_user(): void
    {
        $this->admin();

        Livewire::test(Login::class)
            ->set('usuario', 'admin')
            ->set('senha', 'secret123')
            ->call('authenticate')
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticated();
    }

    public function test_login_rejects_invalid_password(): void
    {
        $this->admin();

        Livewire::test(Login::class)
            ->set('usuario', 'admin')
            ->set('senha', 'errada')
            ->call('authenticate')
            ->assertHasErrors('usuario');

        $this->assertGuest();
    }

    public function test_can_create_aluno(): void
    {
        $admin = $this->admin();

        Livewire::actingAs($admin)
            ->test(AlunoForm::class)
            ->set('data.nome', 'Aluno Novo')
            ->set('data.turma_id', '')
            ->call('salvar')
            ->assertHasNoErrors();

        $this->assertDatabaseHas('alunos', ['nome' => 'Aluno Novo']);
    }
}
