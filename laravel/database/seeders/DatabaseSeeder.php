<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['admin', 'professora'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        User::all()->each(function (User $user) {
            try {
                $user->syncRoles([$user->role ?: 'admin']);
            } catch (\Throwable $e) {
                // ignora papéis inválidos
            }
        });

        if (! User::where('usuario', 'admin')->exists()) {
            $admin = User::create([
                'usuario' => 'admin',
                'name' => 'Administrador',
                'password' => 'admin123',
                'role' => 'admin',
            ]);
            $admin->assignRole('admin');
        }
    }
}
