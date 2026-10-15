<div>
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">
            <i class="bi bi-person-plus"></i>
            {{ $aluno && $aluno->exists ? 'Editar aluno' : 'Novo aluno' }}
        </h3>
        <a href="{{ route('alunos.index') }}" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left"></i> Voltar
        </a>
    </div>

    <form wire:submit="salvar">
        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white"><i class="bi bi-person"></i> Dados do aluno</div>
            <div class="card-body row g-3">
                <div class="col-md-6">
                    <label class="form-label">Nome *</label>
                    <input class="form-control @error('data.nome') is-invalid @enderror" wire:model="data.nome">
                    @error('data.nome') <div class="invalid-feedback">{{ $message }}</div> @enderror
                </div>
                <div class="col-md-3">
                    <label class="form-label">Nascimento</label>
                    <input type="date" class="form-control" wire:model="data.data_nascimento">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Gênero</label>
                    <input class="form-control" wire:model="data.genero">
                </div>
                <div class="col-md-3">
                    <label class="form-label">CPF do aluno</label>
                    <input class="form-control" wire:model="data.cpf_aluno">
                </div>
                <div class="col-md-3">
                    <label class="form-label">Turma</label>
                    <select class="form-select" wire:model="data.turma_id">
                        <option value="">—</option>
                        @foreach ($turmas as $turma)
                            <option value="{{ $turma->id }}">{{ $turma->nome }} — {{ $turma->turno }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label">Turno</label>
                    <input class="form-control" wire:model="data.turno">
                </div>
                <div class="col-md-3">
                    <label class="form-label">E-mail</label>
                    <input type="email" class="form-control" wire:model="data.email_aluno">
                </div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white"><i class="bi bi-image"></i> Foto e documentos</div>
            <div class="card-body row g-3 align-items-center">
                <div class="col-md-3 text-center">
                    @if ($foto && $foto->isPreviewable())
                        <img src="{{ $foto->temporaryUrl() }}" class="rounded-circle" width="120" height="120" style="object-fit: cover;" alt="Pré-visualização">
                    @elseif ($aluno?->foto_url)
                        <img src="{{ $aluno->foto_url }}" class="rounded-circle" width="120" height="120" style="object-fit: cover;" alt="{{ $aluno->nome }}">
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
                    @if ($aluno?->documento_url)
                        <a href="{{ $aluno->documento_url }}" target="_blank" class="small"><i class="bi bi-file-earmark-arrow-down"></i> Ver documento atual</a>
                    @endif
                </div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white"><i class="bi bi-people"></i> Filiação</div>
            <div class="card-body row g-3">
                <div class="col-md-4"><label class="form-label">Mãe</label><input class="form-control" wire:model="data.nome_mae"></div>
                <div class="col-md-4"><label class="form-label">Contato mãe</label><input class="form-control" wire:model="data.contato_mae"></div>
                <div class="col-md-4"><label class="form-label">CPF mãe</label><input class="form-control" wire:model="data.cpf_mae"></div>
                <div class="col-md-4"><label class="form-label">Pai</label><input class="form-control" wire:model="data.nome_pai"></div>
                <div class="col-md-4"><label class="form-label">Contato pai</label><input class="form-control" wire:model="data.contato_pai"></div>
                <div class="col-md-4"><label class="form-label">CPF pai</label><input class="form-control" wire:model="data.cpf_pai"></div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white"><i class="bi bi-geo-alt"></i> Endereço e emergência</div>
            <div class="card-body row g-3">
                <div class="col-md-4"><label class="form-label">Rua</label><input class="form-control" wire:model="data.endereco_rua"></div>
                <div class="col-md-4"><label class="form-label">Bairro</label><input class="form-control" wire:model="data.endereco_bairro"></div>
                <div class="col-md-4"><label class="form-label">Cidade</label><input class="form-control" wire:model="data.endereco_cidade"></div>
                <div class="col-md-6"><label class="form-label">Contato de emergência</label><input class="form-control" wire:model="data.contato_emergencia_nome"></div>
                <div class="col-md-6"><label class="form-label">Telefone de emergência</label><input class="form-control" wire:model="data.contato_emergencia_telefone"></div>
                <div class="col-12"><label class="form-label">Responsáveis pela retirada</label><textarea class="form-control" wire:model="data.responsaveis_retirada"></textarea></div>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white"><i class="bi bi-heart-pulse"></i> Saúde e autorizações</div>
            <div class="card-body row g-3">
                <div class="col-md-6">
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" wire:model="data.alergia_intolerancia" id="alergia">
                        <label class="form-check-label" for="alergia">Alergia / intolerância</label>
                    </div>
                    <textarea class="form-control mt-2" placeholder="Descrição da alergia" wire:model="data.descricao_alergia"></textarea>
                </div>
                <div class="col-md-6">
                    <div class="form-check form-switch"><input class="form-check-input" type="checkbox" wire:model="data.usa_medicamento" id="usaMed"><label class="form-check-label" for="usaMed">Usa medicamento</label></div>
                    <div class="form-check form-switch"><input class="form-check-input" type="checkbox" wire:model="data.necessita_atencao_medicamento" id="atMed"><label class="form-check-label" for="atMed">Necessita atenção com medicamento</label></div>
                    <div class="form-check form-switch"><input class="form-check-input" type="checkbox" wire:model="data.autorizacao_fotos_redes" id="fotos"><label class="form-check-label" for="fotos">Autoriza fotos/redes</label></div>
                    <div class="form-check form-switch"><input class="form-check-input" type="checkbox" wire:model="data.autorizacao_passeios" id="pass"><label class="form-check-label" for="pass">Autoriza passeios</label></div>
                    <div class="form-check form-switch"><input class="form-check-input" type="checkbox" wire:model="data.aniversario_escola" id="aniv"><label class="form-check-label" for="aniv">Comemora aniversário na escola</label></div>
                    <div class="form-check form-switch"><input class="form-check-input" type="checkbox" wire:model="data.pode_brincar_areia" id="areia"><label class="form-check-label" for="areia">Pode brincar na areia</label></div>
                </div>
            </div>
        </div>

        <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary" wire:loading.attr="disabled">
                <i class="bi bi-check-lg"></i> <span wire:loading.remove>Salvar</span><span wire:loading>Salvando...</span>
            </button>
            <a href="{{ route('alunos.index') }}" class="btn btn-outline-secondary">Cancelar</a>
        </div>
    </form>
</div>
