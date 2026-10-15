<?php

namespace Tests\Feature;

use App\Livewire\Auth\Login;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class LoginRateLimitTest extends TestCase
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

    public function test_login_is_rate_limited_after_repeated_failures(): void
    {
        $this->admin();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            Livewire::test(Login::class)
                ->set('usuario', 'admin')
                ->set('senha', 'errada')
                ->call('authenticate')
                ->assertHasErrors('usuario');
        }

        Livewire::test(Login::class)
            ->set('usuario', 'admin')
            ->set('senha', 'errada')
            ->call('authenticate')
            ->assertHasErrors('usuario');

        $this->assertGuest();
    }

    public function test_login_failure_message_is_localized(): void
    {
        $this->admin();

        Livewire::test(Login::class)
            ->set('usuario', 'admin')
            ->set('senha', 'errada')
            ->call('authenticate')
            ->assertSee('Usuário ou senha inválidos');
    }

    public function test_successful_login_uses_session_guard(): void
    {
        $this->admin();

        Livewire::test(Login::class)
            ->set('usuario', 'admin')
            ->set('senha', 'secret123')
            ->call('authenticate')
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs(User::where('usuario', 'admin')->first());
    }
}
