<div>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0"><i class="bi bi-person-vcard"></i> {{ $aluno->nome }}</h3>
        <div>
            <a href="{{ route('relatorios.aluno.pdf', $aluno) }}" class="btn btn-outline-danger"><i class="bi bi-file-earmark-pdf"></i> PDF</a>
            <a href="{{ route('alunos.edit', $aluno) }}" class="btn btn-primary"><i class="bi bi-pencil"></i> Editar</a>
            <a href="{{ route('alunos.index') }}" class="btn btn-outline-secondary"><i class="bi bi-arrow-left"></i> Voltar</a>
        </div>
    </div>

    <div class="row g-3">
        <div class="col-lg-8">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white"><i class="bi bi-info-circle"></i> Ficha cadastral</div>
                <div class="card-body">
                    <dl class="row mb-0">
                        <dt class="col-sm-4">Turma</dt><dd class="col-sm-8">{{ $aluno->turmaVinculada?->nome ?? $aluno->turma }} — {{ $aluno->turno }}</dd>
                        <dt class="col-sm-4">Nascimento</dt><dd class="col-sm-8">{{ optional($aluno->data_nascimento)->format('d/m/Y') }}</dd>
                        <dt class="col-sm-4">Gênero</dt><dd class="col-sm-8">{{ $aluno->genero ?: '—' }}</dd>
                        <dt class="col-sm-4">CPF</dt><dd class="col-sm-8">{{ $aluno->cpf_aluno ?: '—' }}</dd>
                        <dt class="col-sm-4">Mãe</dt><dd class="col-sm-8">{{ $aluno->nome_mae ?: '—' }} <span class="text-muted">{{ $aluno->contato_mae }}</span></dd>
                        <dt class="col-sm-4">Pai</dt><dd class="col-sm-8">{{ $aluno->nome_pai ?: '—' }} <span class="text-muted">{{ $aluno->contato_pai }}</span></dd>
                        <dt class="col-sm-4">E-mail</dt><dd class="col-sm-8">{{ $aluno->email_aluno ?: '—' }}</dd>
                        <dt class="col-sm-4">Endereço</dt>
                        <dd class="col-sm-8">{{ trim(($aluno->endereco_rua ?? '').' '.($aluno->endereco_bairro ?? '').' '.($aluno->endereco_cidade ?? '')) ?: '—' }}</dd>
                        <dt class="col-sm-4">Emergência</dt><dd class="col-sm-8">{{ $aluno->contato_emergencia_nome }} {{ $aluno->contato_emergencia_telefone }}</dd>
                        <dt class="col-sm-4">Responsáveis retirada</dt><dd class="col-sm-8">{{ $aluno->responsaveis_retirada ?: '—' }}</dd>
                        <dt class="col-sm-4">Alergias</dt>
                        <dd class="col-sm-8">
                            {{ $aluno->alergia_intolerancia ? 'Sim' : 'Não' }}
                            @if ($aluno->descricao_alergia) — {{ $aluno->descricao_alergia }} @endif
                        </dd>
                        <dt class="col-sm-4">Autorizações</dt>
                        <dd class="col-sm-8">
                            <span class="badge {{ $aluno->autorizacao_fotos_redes ? 'text-bg-success' : 'text-bg-secondary' }}">Fotos</span>
                            <span class="badge {{ $aluno->autorizacao_passeios ? 'text-bg-success' : 'text-bg-secondary' }}">Passeios</span>
                            <span class="badge {{ $aluno->pode_brincar_areia ? 'text-bg-success' : 'text-bg-secondary' }}">Areia</span>
                        </dd>
                    </dl>
                </div>
            </div>
        </div>

        <div class="col-lg-4">
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body text-center">
                    @if ($aluno->foto_url)
                        <img src="{{ $aluno->foto_url }}" class="rounded-circle mb-2" width="120" height="120" style="object-fit: cover;" alt="{{ $aluno->nome }}">
                    @else
                        <i class="bi bi-person-circle display-1 text-secondary"></i>
                    @endif
                    @if ($aluno->documento_url)
                        <div class="mt-2">
                            <a href="{{ $aluno->documento_url }}" target="_blank" class="small"><i class="bi bi-file-earmark-arrow-down"></i> Documento anexado</a>
                        </div>
                    @endif
                </div>
            </div>
            <div class="card border-0 shadow-sm mb-3">
                <div class="card-body text-center">
                    <div class="text-muted small">Presença (últimos {{ $total }} registros)</div>
                    <div class="display-6 {{ $percentual >= 75 ? 'text-success' : 'text-danger' }}">{{ $percentual }}%</div>
                    <div class="text-muted small">{{ $presentes }} presentes / {{ $total - $presentes }} faltas</div>
                </div>
            </div>
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white"><i class="bi bi-clock-history"></i> Últimas frequências</div>
                <ul class="list-group list-group-flush">
                    @forelse ($frequencias as $f)
                        <li class="list-group-item d-flex justify-content-between">
                            <span>{{ optional($f->data)->format('d/m/Y') }}</span>
                            <span class="badge {{ $f->presente ? 'text-bg-success' : 'text-bg-danger' }}">
                                {{ $f->presente ? 'Presente' : 'Falta' }}
                            </span>
                        </li>
                    @empty
                        <li class="list-group-item text-muted">Sem registros.</li>
                    @endforelse
                </ul>
            </div>
        </div>
    </div>
</div>
