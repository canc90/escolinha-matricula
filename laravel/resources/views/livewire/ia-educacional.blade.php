<div>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0"><i class="bi bi-robot"></i> IA Educacional — Risco e Alertas</h3>
        <button class="btn btn-primary" wire:click="gerarAlertas" wire:loading.attr="disabled">
            <i class="bi bi-magic"></i> Gerar alertas automáticos
        </button>
    </div>

    <div class="row g-3">
        <div class="col-lg-6">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-shield-exclamation"></i> Risco por turma</span>
                    <span class="badge {{ $iaConfigurada ? 'text-bg-success' : 'text-bg-secondary' }}">
                        {{ $iaConfigurada ? 'Gemini conectado' : 'IA local (heurística)' }}
                    </span>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm mb-0 align-middle">
                        <thead class="table-light"><tr><th>Turma</th><th>Presença</th><th>Nível</th><th class="text-end">IA</th></tr></thead>
                        <tbody>
                            @foreach ($turmas as $item)
                                @php $cor = ['BAIXO'=>'success','MEDIO'=>'info','ALTO'=>'warning','CRITICO'=>'danger','SEM_DADOS'=>'secondary'][$item['risco']['nivel']] ?? 'secondary'; @endphp
                                <tr wire:key="turma-{{ $item['turma']->id }}">
                                    <td>{{ $item['turma']->nome }}</td>
                                    <td>{{ $item['risco']['percentual'] !== null ? $item['risco']['percentual'].'%' : '—' }}</td>
                                    <td><span class="badge text-bg-{{ $cor }}">{{ $item['risco']['nivel'] }}</span></td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-outline-primary"
                                                wire:click="recomendar({{ $item['turma']->id }})"
                                                wire:loading.attr="disabled" title="Gerar recomendação">
                                            <i class="bi bi-stars"></i>
                                        </button>
                                    </td>
                                </tr>
                                @isset ($recomendacoes[$item['turma']->id])
                                    <tr wire:key="rec-{{ $item['turma']->id }}">
                                        <td colspan="4" class="bg-light small"><i class="bi bi-robot"></i> {{ $recomendacoes[$item['turma']->id] }}</td>
                                    </tr>
                                @endisset
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="col-lg-6">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white"><i class="bi bi-bell"></i> Alertas</div>
                <ul class="list-group list-group-flush">
                    @forelse ($alertas as $alert)
                        <li class="list-group-item d-flex justify-content-between align-items-start gap-2">
                            <div>
                                <span class="badge text-bg-{{ $alert->severity === 'CRITICAL' ? 'danger' : 'warning' }}">
                                    {{ $alert->severity }}
                                </span>
                                <div class="small">{{ $alert->message }}</div>
                                <div class="text-muted small">{{ $alert->created_at?->format('d/m/Y H:i') }}</div>
                            </div>
                            @if (! $alert->resolved)
                                <button class="btn btn-sm btn-outline-success" wire:click="resolver({{ $alert->id }})">
                                    <i class="bi bi-check-lg"></i>
                                </button>
                            @else
                                <span class="badge text-bg-success">resolvido</span>
                            @endif
                        </li>
                    @empty
                        <li class="list-group-item text-muted">Nenhum alerta.</li>
                    @endforelse
                </ul>
            </div>
        </div>
    </div>
</div>
