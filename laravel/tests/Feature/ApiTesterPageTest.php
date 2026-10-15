<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiTesterPageTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        return User::create([
            'usuario' => $role === 'admin' ? 'admin' : 'prof1',
            'name' => 'Usuário '.$role,
            'password' => 'secret123',
            'role' => $role,
        ]);
    }

    public function test_guests_are_redirected_to_login(): void
    {
        $this->get(route('api.tester'))->assertRedirect(route('login'));
    }

    public function test_non_admin_users_are_forbidden(): void
    {
        $this->actingAs($this->user('professora'))
            ->get(route('api.tester'))
            ->assertForbidden();
    }

    public function test_admin_can_open_the_api_tester_page(): void
    {
        $this->actingAs($this->user('admin'))
            ->get(route('api.tester'))
            ->assertOk()
            ->assertSee('Testar API')
            ->assertSee('api/v1');
    }
}
