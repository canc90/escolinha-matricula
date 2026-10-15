<?php

namespace App\Livewire\Users;

use App\Models\Professora;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Validation\Rule;
use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

#[Layout('layouts::app')]
#[Title('Usuário')]
class UserForm extends Component
{
    public ?User $user = null;

    public array $data = [];

    public function mount(?User $user = null): void
    {
        $this->user = $user;

        if ($user && $user->exists) {
            $this->data = [
                'usuario' => $user->usuario,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'professora_id' => $user->professora_id,
                'password' => '',
            ];
        } else {
            $this->data = ['usuario' => '', 'name' => '', 'email' => '', 'role' => 'professora', 'professora_id' => '', 'password' => ''];
        }
    }

    protected function rules(): array
    {
        $id = $this->user?->id;

        return [
            'data.usuario' => ['required', 'string', 'max:100', Rule::unique('users', 'usuario')->ignore($id)],
            'data.name' => 'required|string|max:200',
            'data.email' => ['nullable', 'email', 'max:254', Rule::unique('users', 'email')->ignore($id)],
            'data.role' => 'required|in:admin,professora',
            'data.professora_id' => 'nullable|exists:professoras,id',
            'data.password' => [$this->user?->exists ? 'nullable' : 'required', 'string', 'min:6'],
        ];
    }

    public function salvar()
    {
        $validated = $this->validate();
        $payload = $validated['data'];

        if (empty($payload['professora_id'])) {
            $payload['professora_id'] = null;
        }

        if (empty($payload['password'])) {
            unset($payload['password']);
        }

        if ($this->user && $this->user->exists) {
            $before = $this->user->toArray();
            $this->user->update($payload);
            $user = $this->user;
            Audit::log('update', 'users', $user->id, $before, $user->fresh()->toArray());
            session()->flash('status', 'Usuário atualizado com sucesso.');
        } else {
            $user = User::create($payload);
            Audit::log('create', 'users', $user->id, null, $user->toArray());
            session()->flash('status', 'Usuário cadastrado com sucesso.');
        }

        try {
            $user->syncRoles([$user->role]);
        } catch (\Throwable $e) {
            // ignora
        }

        return redirect()->route('users.index');
    }

    public function render()
    {
        $professoras = Professora::orderBy('nome')->get();

        return view('livewire.users.form', compact('professoras'));
    }
}
