<?php

namespace App\Livewire\Users;

use App\Models\User;
use App\Support\Audit;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Usuários')]
class UsersIndex extends Component
{
    public function excluir(int $id): void
    {
        if ($id === auth()->id()) {
            session()->flash('status', 'Você não pode excluir o próprio usuário.');

            return;
        }

        $user = User::findOrFail($id);
        $user->delete();
        Audit::log('delete', 'users', $id, $user->toArray());

        session()->flash('status', 'Usuário removido com sucesso.');
    }

    public function render()
    {
        $users = User::with('professora')->orderBy('name')->get();

        return view('livewire.users.index', compact('users'));
    }
}
