<div>
    <h3 class="mb-4"><i class="bi bi-speedometer2"></i> Painel Geral</h3>

    <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
            <div class="card card-stat border-0 shadow-sm h-100">
                <div class="card-body">
                    <div class="text-muted small">Alunos</div>
                    <div class="display-6 text-primary">{{ $totalAlunos }}</div>
                </div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="card card-stat border-0 shadow-sm h-100">
                <div class="card-body">
                    <div class="text-muted small">Professoras</div>
                    <div class="display-6 text-success">{{ $totalProfessoras }}</div>
                </div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="card card-stat border-0 shadow-sm h-100">
                <div class="card-body">
                    <div class="text-muted small">Turmas</div>
                    <div class="display-6 text-warning">{{ $totalTurmas }}</div>
                </div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="card card-stat border-0 shadow-sm h-100">
                <div class="card-body">
                    <div class="text-muted small">Presença hoje</div>
                    <div class="display-6 {{ $percentualHoje >= 75 ? 'text-success' : 'text-danger' }}">
                        {{ $percentualHoje }}%
                    </div>
                    <small class="text-muted">{{ $presencasHoje }}/{{ $totalHoje }} registros</small>
                </div>
            </div>
        </div>
    </div>

    <div class="card border-0 shadow-sm">
        <div class="card-header bg-white">
            <i class="bi bi-clock-history"></i> Últimas atividades
        </div>
        <div class="table-responsive">
            <table class="table table-sm mb-0 align-middle">
                <thead class="table-light">
                    <tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th></tr>
                </thead>
                <tbody>
                    @forelse ($ultimosLogs as $log)
                        <tr>
                            <td class="text-muted small">{{ $log->created_at?->format('d/m/Y H:i') }}</td>
                            <td>{{ $log->user_id }}</td>
                            <td><span class="badge text-bg-secondary">{{ $log->action }}</span></td>
                            <td class="text-muted">{{ $log->entity }} #{{ $log->entity_id }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="4" class="text-center text-muted py-3">Sem atividades.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
