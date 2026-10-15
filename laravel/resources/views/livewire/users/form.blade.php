<div>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0"><i class="bi bi-person-gear"></i> {{ $user && $user->exists ? 'Editar usuário' : 'Novo usuário' }}</h3>
        <a href="{{ route('users.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left"></i> Voltar</a>
    </div>

    <form wire:submit="salvar">
        <div class="card border-0 shadow-sm mb-3">
            <div class="card-body row g-3">
                <div class="col-md-3">
                    <label class="form-label">Usuário *</label>
                    <input class="form-control @error('data.usuario') is-invalid @enderror" wire:model="data.usuario">
                    @error('data.usuario') <div class="invalid-feedback">{{ $message }}</div> @enderror
                </div>
                <div class="col-md-5">
                    <label class="form-label">Nome *</label>
                    <input class="form-control @error('data.name') is-invalid @enderror" wire:model="data.name">
                    @error('data.name') <div class="invalid-feedback">{{ $message }}</div> @enderror
                </div>
                <div class="col-md-4"><label class="form-label">E-mail</label><input class="form-control" wire:model="data.email"></div>

                <div class="col-md-4">
                    <label class="form-label">Perfil *</label>
                    <select class="form-select" wire:model.live="data.role">
                        <option value="admin">Administrador</option>
                        <option value="professora">Professora</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Professora vinculada</label>
                    <select class="form-select" wire:model="data.professora_id">
                        <option value="">—</option>
                        @foreach ($professoras as $p)
                            <option value="{{ $p->id }}">{{ $p->nome }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">
                        Senha {{ $user && $user->exists ? '(deixe vazio para manter)' : '*' }}
                    </label>
                    <input type="password" class="form-control @error('data.password') is-invalid @enderror" wire:model="data.password">
                    @error('data.password') <div class="invalid-feedback">{{ $message }}</div> @enderror
                </div>
            </div>
        </div>

        <button type="submit" class="btn btn-primary" wire:loading.attr="disabled">
            <i class="bi bi-check-lg"></i> <span wire:loading.remove>Salvar</span><span wire:loading>Salvando...</span>
        </button>
    </form>
</div>
