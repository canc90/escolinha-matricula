<div>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0"><i class="bi bi-diagram-3"></i> Turmas</h3>
        <a href="{{ route('turmas.create') }}" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Nova turma</a>
    </div>

    <div class="card border-0 shadow-sm">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                    <tr><th>#</th><th>Turma</th><th>Turno</th><th>Ano</th><th>Alunos</th><th>Professoras</th><th class="text-end">Ações</th></tr>
                </thead>
                <tbody>
                    @forelse ($turmas as $turma)
                        <tr wire:key="turma-{{ $turma->id }}">
                            <td class="text-muted">{{ $turma->id }}</td>
                            <td><strong>{{ $turma->nome }}</strong></td>
                            <td>{{ $turma->turno }}</td>
                            <td>{{ $turma->ano_letivo }}</td>
                            <td><span class="badge text-bg-primary">{{ $totalAlunos[$turma->id] ?? 0 }}</span></td>
                            <td>
                                @foreach (($professorasPorTurma[$turma->id] ?? []) as $row)
                                    <span class="badge text-bg-secondary">{{ $row->nome }}</span>
                                @endforeach
                            </td>
                            <td class="text-end text-nowrap">
                                <a href="{{ route('relatorios.turma.pdf', $turma) }}" class="btn btn-sm btn-outline-danger" title="Relatório PDF"><i class="bi bi-file-earmark-pdf"></i></a>
                                <a href="{{ route('relatorios.turma.csv', $turma) }}" class="btn btn-sm btn-outline-success" title="Relatório CSV"><i class="bi bi-filetype-csv"></i></a>
                                <a href="{{ route('turmas.edit', $turma) }}" class="btn btn-sm btn-outline-primary"><i class="bi bi-pencil"></i></a>
                                @if (auth()->user()->isAdmin())
                                    <button class="btn btn-sm btn-outline-danger" wire:click="excluir({{ $turma->id }})"
                                            wire:confirm="Excluir turma {{ $turma->nome }}?"><i class="bi bi-trash"></i></button>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="text-center text-muted py-4">Nenhuma turma cadastrada.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
