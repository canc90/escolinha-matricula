<div>
    <h3 class="mb-4"><i class="bi bi-bar-chart"></i> Indicadores da Direção</h3>

    <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm"><div class="card-body">
                <div class="text-muted small">Presença geral</div>
                <div class="display-6 text-primary">{{ $kpis['percentualGeral'] }}%</div>
            </div></div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm"><div class="card-body">
                <div class="text-muted small">Registros</div>
                <div class="display-6 text-secondary">{{ $kpis['totalRegistros'] }}</div>
            </div></div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm"><div class="card-body">
                <div class="text-muted small">Presenças</div>
                <div class="display-6 text-success">{{ $kpis['totalPresencas'] }}</div>
            </div></div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="card border-0 shadow-sm"><div class="card-body">
                <div class="text-muted small">Turmas avaliadas</div>
                <div class="display-6 text-warning">{{ $rankingTurmas->count() }}</div>
            </div></div>
        </div>
    </div>

    <div class="row g-3">
        <div class="col-lg-7">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white"><i class="bi bi-graph-up"></i> Evolução da presença (%)</div>
                <div class="card-body"><canvas id="graficoEvolucao" height="120"></canvas></div>
            </div>
        </div>
        <div class="col-lg-5">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white"><i class="bi bi-trophy"></i> Ranking de turmas</div>
                <div class="table-responsive">
                    <table class="table table-sm mb-0 align-middle">
                        <thead class="table-light"><tr><th>Turma</th><th>Turno</th><th>%</th></tr></thead>
                        <tbody>
                            @foreach ($rankingTurmas as $t)
                                <tr>
                                    <td>{{ $t['nome'] }}</td>
                                    <td class="text-muted">{{ $t['turno'] }}</td>
                                    <td>
                                        <span class="badge {{ $t['percentual'] >= 75 ? 'text-bg-success' : 'text-bg-danger' }}">
                                            {{ $t['percentual'] }}%
                                        </span>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <div class="card border-0 shadow-sm mt-3">
        <div class="card-header bg-white"><i class="bi bi-person-badge"></i> Professores com mais registros no diário</div>
        <div class="card-body d-flex flex-wrap gap-2">
            @forelse ($rankingProfessoras as $p)
                <span class="badge text-bg-light border">{{ $p->nome }}: {{ $p->registros }}</span>
            @empty
                <span class="text-muted">Sem registros.</span>
            @endforelse
        </div>
    </div>

    <script>
        document.addEventListener('livewire:initialized', () => {
            const ctx = document.getElementById('graficoEvolucao');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: @json($evolucao->pluck('data')),
                        datasets: [{
                            label: '% Presença',
                            data: @json($evolucao->pluck('percentual')),
                            borderColor: '#0d6efd',
                            backgroundColor: 'rgba(13,110,253,.15)',
                            fill: true,
                            tension: .3,
                        }]
                    },
                    options: { scales: { y: { min: 0, max: 100 } } }
                });
            }
        });
    </script>
</div>
