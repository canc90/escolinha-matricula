<div class="card shadow" style="width: 22rem;">
    <div class="card-body p-4">
        <div class="text-center mb-4">
            <div class="display-5 text-primary"><i class="bi bi-mortarboard-fill"></i></div>
            <h5 class="mt-2 mb-0">Sistema de Gestão Escolar</h5>
            <small class="text-muted">Entre com suas credenciais</small>
        </div>

        <form wire:submit="authenticate">
            <div class="mb-3">
                <label class="form-label">Usuário</label>
                <input type="text" class="form-control @error('usuario') is-invalid @enderror"
                       wire:model="usuario" autofocus autocomplete="username">
                @error('usuario') <div class="invalid-feedback">{{ $message }}</div> @enderror
            </div>

            <div class="mb-3">
                <label class="form-label">Senha</label>
                <input type="password" class="form-control @error('senha') is-invalid @enderror"
                       wire:model="senha" autocomplete="current-password">
                @error('senha') <div class="invalid-feedback">{{ $message }}</div> @enderror
            </div>

            <div class="form-check mb-3">
                <input type="checkbox" class="form-check-input" id="remember" wire:model="remember">
                <label class="form-check-label" for="remember">Manter conectado</label>
            </div>

            <button class="btn btn-primary w-100" type="submit" wire:loading.attr="disabled">
                <span wire:loading.remove><i class="bi bi-box-arrow-in-right"></i> Entrar</span>
                <span wire:loading>Entrando...</span>
            </button>
        </form>
    </div>
</div>
