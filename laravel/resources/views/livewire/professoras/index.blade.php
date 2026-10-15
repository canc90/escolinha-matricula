<div>
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h3 class="mb-0"><i class="bi bi-person-badge"></i> Professoras</h3>
        <a href="{{ route('professoras.create') }}" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Nova professora</a>
    </div>

    <div class="card border-0 shadow-sm">
        <div class="card-body">
            <input type="text" class="form-control mb-3" placeholder="Buscar por nome..."
                   wire:model.live.debounce.400ms="busca">

            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr><th>#</th><th>Nome</th><th>E-mail</th><th>Especialidade</th><th>Turmas</th><th class="text-end">Ações</th></tr>
                    </thead>
                    <tbody>
                        @forelse ($professoras as $p)
                            <tr wire:key="prof-{{ $p->id }}">
                                <td class="text-muted">{{ $p->id }}</td>
                                <td>
                                    <div class="d-flex align-items-center gap-2">
                                        @if ($p->foto_url)
                                            <img src="{{ $p->foto_url }}" class="rounded-circle" width="32" height="32" style="object-fit: cover;" alt="{{ $p->nome }}">
                                        @else
                                            <span class="rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                                                <i class="bi bi-person text-secondary"></i>
                                            </span>
                                        @endif
                                        {{ $p->nome }}
                                    </div>
                                </td>
                                <td class="text-muted">{{ $p->email }}</td>
                                <td>{{ $p->especialidade }}</td>
                                <td><span class="badge text-bg-info">{{ $p->turmas_count }}</span></td>
                                <td class="text-end text-nowrap">
                                    <a href="{{ route('professoras.edit', $p) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></a>
                                    @if (auth()->user()->isAdmin())
                                        <button class="btn btn-sm btn-outline-danger" wire:click="excluir({{ $p->id }})"
                                                wire:confirm="Excluir {{ $p->nome }}?"><i class="bi bi-trash"></i></button>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="text-center text-muted py-4">Nenhuma professora encontrada.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            {{ $professoras->links() }}
        </div>
    </div>
</div>
