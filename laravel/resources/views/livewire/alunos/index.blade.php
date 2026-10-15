<div>
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h3 class="mb-0"><i class="bi bi-people"></i> Alunos</h3>
        <a href="{{ route('alunos.create') }}" class="btn btn-primary">
            <i class="bi bi-plus-lg"></i> Novo aluno
        </a>
    </div>

    <div class="card border-0 shadow-sm">
        <div class="card-body">
            <div class="row g-2 mb-3">
                <div class="col-12 col-md-6">
                    <input type="text" class="form-control" placeholder="Buscar por nome..."
                           wire:model.live.debounce.400ms="busca">
                </div>
                <div class="col-12 col-md-4">
                    <select class="form-select" wire:model.live="turmaFiltro">
                        <option value="">Todas as turmas</option>
                        @foreach ($turmas as $turma)
                            <option value="{{ $turma->id }}">{{ $turma->nome }} — {{ $turma->turno }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="col-12 col-md-2">
                    <div class="text-muted small mt-2">Total: {{ $alunos->total() }}</div>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>#</th>
                            <th>Nome</th>
                            <th>Turma</th>
                            <th>Turno</th>
                            <th>Nascimento</th>
                            <th class="text-end">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($alunos as $aluno)
                            <tr wire:key="aluno-{{ $aluno->id }}">
                                <td class="text-muted">{{ $aluno->id }}</td>
                                <td>
                                    <div class="d-flex align-items-center gap-2">
                                        @if ($aluno->foto_url)
                                            <img src="{{ $aluno->foto_url }}" class="rounded-circle" width="32" height="32" style="object-fit: cover;" alt="{{ $aluno->nome }}">
                                        @else
                                            <span class="rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                                                <i class="bi bi-person text-secondary"></i>
                                            </span>
                                        @endif
                                        {{ $aluno->nome }}
                                    </div>
                                </td>
                                <td>{{ $aluno->turmaVinculada?->nome ?? $aluno->turma }}</td>
                                <td>{{ $aluno->turno }}</td>
                                <td>{{ optional($aluno->data_nascimento)->format('d/m/Y') }}</td>
                                <td class="text-end text-nowrap">
                                    <a href="{{ route('alunos.show', $aluno) }}" class="btn btn-sm btn-outline-secondary">
                                        <i class="bi bi-eye"></i>
                                    </a>
                                    <a href="{{ route('alunos.edit', $aluno) }}" class="btn btn-sm btn-outline-primary">
                                        <i class="bi bi-pencil"></i>
                                    </a>
                                    @if (auth()->user()->isAdmin())
                                        <button class="btn btn-sm btn-outline-danger"
                                                wire:click="excluir({{ $aluno->id }})"
                                                wire:confirm="Excluir {{ $aluno->nome }}?">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="text-center text-muted py-4">Nenhum aluno encontrado.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            {{ $alunos->links() }}
        </div>
    </div>
</div>
