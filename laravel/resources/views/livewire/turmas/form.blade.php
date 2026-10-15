<div>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0"><i class="bi bi-diagram-3"></i> {{ $turma && $turma->exists ? 'Editar turma' : 'Nova turma' }}</h3>
        <a href="{{ route('turmas.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left"></i> Voltar</a>
    </div>

    <form wire:submit="salvar">
        <div class="card border-0 shadow-sm mb-3">
            <div class="card-body row g-3">
                <div class="col-md-4">
                    <label class="form-label">Nome *</label>
                    <input class="form-control @error('data.nome') is-invalid @enderror" wire:model="data.nome">
                    @error('data.nome') <div class="invalid-feedback">{{ $message }}</div> @enderror
                </div>
                <div class="col-md-4"><label class="form-label">Turno</label><input class="form-control" wire:model="data.turno"></div>
                <div class="col-md-4"><label class="form-label">Ano letivo</label><input class="form-control" wire:model="data.ano_letivo"></div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white"><i class="bi bi-person-badge"></i> Professoras</div>
            <div class="card-body row">
                @forelse ($professoras as $p)
                    <div class="col-md-4">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" value="{{ $p->id }}"
                                   id="prof-{{ $p->id }}" wire:model="professorasSelecionadas">
                            <label class="form-check-label" for="prof-{{ $p->id }}">{{ $p->nome }}</label>
                        </div>
                    </div>
                @empty
                    <div class="text-muted">Nenhuma professora cadastrada.</div>
                @endforelse
            </div>
        </div>

        <button type="submit" class="btn btn-primary" wire:loading.attr="disabled">
            <i class="bi bi-check-lg"></i> <span wire:loading.remove>Salvar</span><span wire:loading>Salvando...</span>
        </button>
    </form>
</div>
