<div>
    <h3 class="mb-3"><i class="bi bi-upload"></i> Importação de dados (CSV)</h3>

    <div class="card border-0 shadow-sm mb-3">
        <div class="card-body">
            <form wire:submit="importar" class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Tipo de dados</label>
                    <select class="form-select" wire:model="tipo">
                        <option value="alunos">Alunos</option>
                        <option value="professoras">Professoras</option>
                        <option value="turmas">Turmas</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Arquivo CSV</label>
                    <input type="file" class="form-control @error('arquivo') is-invalid @enderror" wire:model="arquivo" accept=".csv,text/csv">
                    @error('arquivo') <div class="invalid-feedback">{{ $message }}</div> @enderror
                </div>
                <div class="col-md-2 d-flex align-items-end">
                    <button class="btn btn-primary w-100" wire:loading.attr="disabled">
                        <span wire:loading.remove>Importar</span><span wire:loading>...</span>
                    </button>
                </div>
            </form>
            <div class="text-muted small mt-2">
                O CSV deve ter cabeçalho. Separadores <code>,</code> <code>;</code> e TAB são detectados automaticamente.
            </div>
        </div>
    </div>

    @if ($resumo)
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white"><i class="bi bi-list-check"></i> Resultado</div>
            <div class="card-body">
                <p class="mb-2">
                    <span class="badge text-bg-success">{{ $resumo['inseridos'] }} inseridos</span>
                    <span class="badge text-bg-secondary">{{ $resumo['total'] }} linhas lidas</span>
                </p>
                @if (! empty($resumo['erros']))
                    <div class="alert alert-warning mb-0">
                        <strong>Erros:</strong>
                        <ul class="mb-0">
                            @foreach ($resumo['erros'] as $erro)
                                <li>{{ $erro }}</li>
                            @endforeach
                        </ul>
                    </div>
                @endif
            </div>
        </div>
    @endif
</div>
