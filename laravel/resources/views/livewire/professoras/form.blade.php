<div>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0"><i class="bi bi-person-badge"></i> {{ $professora && $professora->exists ? 'Editar professora' : 'Nova professora' }}</h3>
        <a href="{{ route('professoras.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left"></i> Voltar</a>
    </div>

    <form wire:submit="salvar">
        <div class="card border-0 shadow-sm mb-3">
            <div class="card-body row g-3">
                <div class="col-md-6">
                    <label class="form-label">Nome *</label>
                    <input class="form-control @error('data.nome') is-invalid @enderror" wire:model="data.nome">
                    @error('data.nome') <div class="invalid-feedback">{{ $message }}</div> @enderror
                </div>
                <div class="col-md-6"><label class="form-label">E-mail</label><input class="form-control" wire:model="data.email"></div>
                <div class="col-md-4"><label class="form-label">Telefone</label><input class="form-control" wire:model="data.telefone"></div>
                <div class="col-md-4"><label class="form-label">Especialidade</label><input class="form-control" wire:model="data.especialidade"></div>
                <div class="col-md-4"><label class="form-label">Turno</label><input class="form-control" wire:model="data.turno"></div>
                <div class="col-md-3"><label class="form-label">RG</label><input class="form-control" wire:model="data.rg"></div>
                <div class="col-md-3"><label class="form-label">CPF</label><input class="form-control" wire:model="data.cpf"></div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white"><i class="bi bi-image"></i> Foto e documentos</div>
            <div class="card-body row g-3 align-items-center">
                <div class="col-md-3 text-center">
                    @if ($foto && $foto->isPreviewable())
                        <img src="{{ $foto->temporaryUrl() }}" class="rounded-circle" width="120" height="120" style="object-fit: cover;" alt="Pré-visualização">
                    @elseif ($professora?->foto_url)
                        <img src="{{ $professora->foto_url }}" class="rounded-circle" width="120" height="120" style="object-fit: cover;" alt="{{ $professora->nome }}">
                    @else
                        <div class="rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style="width: 120px; height: 120px;">
                            <i class="bi bi-person text-secondary fs-1"></i>
                        </div>
                    @endif
                </div>
                <div class="col-md-4">
                    <label class="form-label">Foto (imagem, até 4 MB)</label>
                    <input type="file" class="form-control @error('foto') is-invalid @enderror" wire:model="foto" accept="image/*">
                    @error('foto') <div class="invalid-feedback">{{ $message }}</div> @enderror
                    <div wire:loading wire:target="foto" class="text-muted small mt-1">Enviando...</div>
                </div>
                <div class="col-md-5">
                    <label class="form-label">Documento (PDF/JPG/PNG, até 8 MB)</label>
                    <input type="file" class="form-control @error('documento') is-invalid @enderror" wire:model="documento" accept=".pdf,image/*">
                    @error('documento') <div class="invalid-feedback">{{ $message }}</div> @enderror
                    @if ($professora?->documento_url)
                        <a href="{{ $professora->documento_url }}" target="_blank" class="small"><i class="bi bi-file-earmark-arrow-down"></i> Ver documento atual</a>
                    @endif
                </div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white"><i class="bi bi-diagram-3"></i> Turmas vinculadas</div>
            <div class="card-body">
                <div class="row">
                    @forelse ($turmas as $turma)
                        <div class="col-md-4">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="{{ $turma->id }}"
                                       id="turma-{{ $turma->id }}" wire:model="turmasSelecionadas">
                                <label class="form-check-label" for="turma-{{ $turma->id }}">
                                    {{ $turma->nome }} <span class="text-muted">— {{ $turma->turno }}</span>
                                </label>
                            </div>
                        </div>
                    @empty
                        <div class="text-muted">Nenhuma turma cadastrada.</div>
                    @endforelse
                </div>
            </div>
        </div>

        <button type="submit" class="btn btn-primary" wire:loading.attr="disabled">
            <i class="bi bi-check-lg"></i> <span wire:loading.remove>Salvar</span><span wire:loading>Salvando...</span>
        </button>
    </form>
</div>
