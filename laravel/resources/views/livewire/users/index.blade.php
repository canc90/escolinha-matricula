<div>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0"><i class="bi bi-gear"></i> Usuários</h3>
        <a href="{{ route('users.create') }}" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Novo usuário</a>
    </div>

    <div class="card border-0 shadow-sm">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr><th>#</th><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Professora</th><th class="text-end">Ações</th></tr>
                </thead>
                <tbody>
                    @foreach ($users as $user)
                        <tr wire:key="user-{{ $user->id }}">
                            <td class="text-muted">{{ $user->id }}</td>
                            <td>{{ $user->name }}</td>
                            <td><code>{{ $user->usuario }}</code></td>
                            <td><span class="badge {{ $user->role === 'admin' ? 'text-bg-danger' : 'text-bg-info' }}">{{ $user->role }}</span></td>
                            <td class="text-muted">{{ $user->professora?->nome }}</td>
                            <td class="text-end text-nowrap">
                                <a href="{{ route('users.edit', $user) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></a>
                                <button class="btn btn-sm btn-outline-danger" wire:click="excluir({{ $user->id }})"
                                        wire:confirm="Remover usuário {{ $user->name }}?"><i class="bi bi-trash"></i></button>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</div>
