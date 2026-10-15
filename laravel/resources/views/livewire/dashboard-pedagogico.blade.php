<div>
    <h3 class="mb-4"><i class="bi bi-clipboard2-data"></i> Painel Pedagógico</h3>

    <div class="row g-3">
        @forelse ($turmasInfo as $info)
            <div class="col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="mb-0">{{ $info['turma']->nome }}</h5>
                                <small class="text-muted">{{ $info['turma']->turno }} — {{ $info['turma']->ano_letivo }}</small>
                            </div>
                            @if ($info['percentual'] !== null)
                                <span class="badge {{ $info['percentual'] >= 75 ? 'text-bg-success' : 'text-bg-danger' }} fs-6">
                                    {{ $info['percentual'] }}%
                                </span>
                            @else
                                <span class="badge text-bg-secondary">s/ dados</span>
                            @endif
                        </div>
                        <hr>
                        <div class="text-muted small">
                            <i class="bi bi-people"></i> {{ $info['alunos'] }} alunos
                        </div>
                        <a href="{{ route('frequencias.index', ['turma' => $info['turma']->id]) }}"
                           class="btn btn-sm btn-outline-primary mt-2">
                            <i class="bi bi-check2-square"></i> Abrir chamada
                        </a>
                    </div>
                </div>
            </div>
        @empty
            <div class="col-12"><div class="alert alert-info">Nenhuma turma cadastrada.</div></div>
        @endforelse
    </div>
</div>
