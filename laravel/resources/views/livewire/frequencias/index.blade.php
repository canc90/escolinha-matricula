<div>
    <h3 class="mb-3"><i class="bi bi-check2-square"></i> Chamada / Frequências</h3>

    <div class="card border-0 shadow-sm mb-3">
        <div class="card-body row g-2 align-items-end">
            <div class="col-md-5">
                <label class="form-label">Turma</label>
                <select class="form-select" wire:model.live="turmaId">
                    <option value="">Selecione uma turma...</option>
                    @foreach ($turmas as $t)
                        <option value="{{ $t->id }}">{{ $t->nome }} — {{ $t->turno }}</option>
                    @endforeach
                </select>
            </div>
            <div class="col-md-4">
                <label class="form-label">Data</label>
                <input type="date" class="form-control" wire:model.live="data">
            </div>
            <div class="col-md-3 text-end">
                @if ($alunos->isNotEmpty())
                    <span class="badge text-bg-success">{{ $presentes }} presentes</span>
                    <span class="badge text-bg-danger">{{ $alunos->count() - $presentes }} faltas</span>
                @endif
            </div>
        </div>
    </div>

    @if ($turmaId)
        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <div class="mb-3">
                    <button class="btn btn-sm btn-outline-success" wire:click="marcarTodos(true)">Todos presentes</button>
                    <button class="btn btn-sm btn-outline-danger" wire:click="marcarTodos(false)">Todos ausentes</button>
                </div>

                <div class="table-responsive">
                    <table class="table align-middle">
                        <thead class="table-light"><tr><th>Aluno</th><th class="text-center">Presente</th></tr></thead>
                        <tbody>
                            @forelse ($alunos as $aluno)
                                <tr wire:key="freq-{{ $aluno->id }}">
                                    <td>{{ $aluno->nome }}</td>
                                    <td class="text-center">
                                        <input type="checkbox" class="form-check-input" style="transform:scale(1.4);"
                                               wire:model.live="presencas.{{ $aluno->id }}">
                                    </td>
                                </tr>
                            @empty
                                <tr><td colspan="2" class="text-center text-muted py-4">Nenhum aluno nesta turma.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                @if ($alunos->isNotEmpty())
                    <button class="btn btn-primary" wire:click="salvar" wire:loading.attr="disabled">
                        <i class="bi bi-save"></i> Salvar chamada
                    </button>
                @endif
            </div>
        </div>
    @else
        <div class="alert alert-info">Selecione uma turma e uma data para registrar a chamada.</div>
    @endif
</div>
