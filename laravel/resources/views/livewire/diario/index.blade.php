<div>
    <h3 class="mb-3"><i class="bi bi-journal-text"></i> Diário de classe</h3>

    <div class="row g-3">
        <div class="col-lg-4">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white"><i class="bi bi-plus-circle"></i> Novo registro</div>
                <div class="card-body">
                    <form wire:submit="salvar" class="vstack gap-2">
                        <div>
                            <label class="form-label">Turma *</label>
                            <select class="form-select @error('form.turma_id') is-invalid @enderror" wire:model="form.turma_id">
                                <option value="">Selecione...</option>
                                @foreach ($turmas as $t)
                                    <option value="{{ $t->id }}">{{ $t->nome }} — {{ $t->turno }}</option>
                                @endforeach
                            </select>
                            @error('form.turma_id') <div class="invalid-feedback">{{ $message }}</div> @enderror
                        </div>
                        <div>
                            <label class="form-label">Professora</label>
                            <select class="form-select" wire:model="form.professora_id">
                                <option value="">—</option>
                                @foreach ($professoras as $p)
                                    <option value="{{ $p->id }}">{{ $p->nome }}</option>
                                @endforeach
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Data *</label>
                            <input type="date" class="form-control" wire:model="form.data">
                        </div>
                        <div>
                            <label class="form-label">Conteúdo da aula</label>
                            <textarea class="form-control" rows="3" wire:model="form.conteudo_aula"></textarea>
                        </div>
                        <div>
                            <label class="form-label">Observações</label>
                            <textarea class="form-control" rows="2" wire:model="form.observacoes"></textarea>
                        </div>
                        <button class="btn btn-primary" wire:loading.attr="disabled">
                            <i class="bi bi-check-lg"></i> Salvar registro
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <div class="col-lg-8">
            <div class="card border-0 shadow-sm">
                <div class="card-body">
                    <select class="form-select mb-3" wire:model.live="turmaFiltro">
                        <option value="">Todas as turmas</option>
                        @foreach ($turmas as $t)
                            <option value="{{ $t->id }}">{{ $t->nome }}</option>
                        @endforeach
                    </select>

                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr><th>Data</th><th>Turma</th><th>Professora</th><th>Conteúdo</th><th></th></tr>
                            </thead>
                            <tbody>
                                @forelse ($registros as $r)
                                    <tr wire:key="diario-{{ $r->id }}">
                                        <td>{{ optional($r->data)->format('d/m/Y') }}</td>
                                        <td>{{ $r->turma?->nome }}</td>
                                        <td class="text-muted">{{ $r->professora?->nome }}</td>
                                        <td class="text-truncate" style="max-width:220px;">{{ $r->conteudo_aula }}</td>
                                        <td class="text-end">
                                            @if (auth()->user()->isAdmin())
                                                <button class="btn btn-sm btn-outline-danger" wire:click="excluir({{ $r->id }})"
                                                        wire:confirm="Excluir registro?"><i class="bi bi-trash"></i></button>
                                            @endif
                                        </td>
                                    </tr>
                                @empty
                                    <tr><td colspan="5" class="text-center text-muted py-4">Nenhum registro.</td></tr>
                                @endforelse
                            </tbody>
                        </table>
                    </div>
                    {{ $registros->links() }}
                </div>
            </div>
        </div>
    </div>
</div>
