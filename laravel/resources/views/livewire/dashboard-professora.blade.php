<div>
    <h3 class="mb-4"><i class="bi bi-person-workspace"></i> Olá{{ $professora ? ', '.$professora->nome : '' }}!</h3>

    @if (! $professora)
        <div class="alert alert-warning">
            Seu usuário ainda não está vinculado a um cadastro de professora. Procure a direção.
        </div>
    @else
        <div class="row g-3 mb-4">
            <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm"><div class="card-body">
                    <div class="text-muted small">Minhas turmas</div>
                    <div class="display-6 text-primary">{{ $turmas->count() }}</div>
                </div></div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="card border-0 shadow-sm"><div class="card-body">
                    <div class="text-muted small">Alunos</div>
                    <div class="display-6 text-success">{{ $totalAlunos }}</div>
                </div></div>
            </div>
        </div>

        <div class="card border-0 shadow-sm">
            <div class="card-header bg-white"><i class="bi bi-diagram-3"></i> Minhas turmas</div>
            <ul class="list-group list-group-flush">
                @forelse ($turmas as $turma)
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>
                            <strong>{{ $turma->nome }}</strong>
                            <span class="text-muted">— {{ $turma->turno }}</span>
                            @if ($turma->pivot->principal)
                                <span class="badge text-bg-info">principal</span>
                            @endif
                        </span>
                        <a class="btn btn-sm btn-outline-primary"
                           href="{{ route('frequencias.index', ['turma' => $turma->id]) }}">
                            <i class="bi bi-check2-square"></i> Chamada
                        </a>
                    </li>
                @empty
                    <li class="list-group-item text-muted">Nenhuma turma vinculada.</li>
                @endforelse
            </ul>
        </div>
    @endif
</div>
