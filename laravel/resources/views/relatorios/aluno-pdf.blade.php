<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Ficha do aluno</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #212529; font-size: 12px; }
        h1 { font-size: 18px; margin: 0; }
        .muted { color: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #dee2e6; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f1f3f5; width: 30%; }
        header { border-bottom: 2px solid #0d6efd; padding-bottom: 8px; margin-bottom: 12px; }
    </style>
</head>
<body>
    <header>
        <h1>Ficha do Aluno</h1>
        <div class="muted">{{ config('app.name') }} — emitido em {{ now()->format('d/m/Y H:i') }}</div>
    </header>

    <table>
        <tr><th>Nome</th><td>{{ $aluno->nome }}</td></tr>
        <tr><th>Turma</th><td>{{ $aluno->turmaVinculada?->nome ?? $aluno->turma }} — {{ $aluno->turno }}</td></tr>
        <tr><th>Nascimento</th><td>{{ optional($aluno->data_nascimento)->format('d/m/Y') ?: '—' }}</td></tr>
        <tr><th>Gênero</th><td>{{ $aluno->genero ?: '—' }}</td></tr>
        <tr><th>CPF</th><td>{{ $aluno->cpf_aluno ?: '—' }}</td></tr>
        <tr><th>Mãe</th><td>{{ $aluno->nome_mae ?: '—' }} {{ $aluno->contato_mae }}</td></tr>
        <tr><th>Pai</th><td>{{ $aluno->nome_pai ?: '—' }} {{ $aluno->contato_pai }}</td></tr>
        <tr><th>E-mail</th><td>{{ $aluno->email_aluno ?: '—' }}</td></tr>
        <tr><th>Endereço</th><td>{{ trim(($aluno->endereco_rua ?? '').' '.($aluno->endereco_bairro ?? '').' '.($aluno->endereco_cidade ?? '')) ?: '—' }}</td></tr>
        <tr><th>Contato de emergência</th><td>{{ $aluno->contato_emergencia_nome }} {{ $aluno->contato_emergencia_telefone }}</td></tr>
        <tr><th>Alergias</th><td>{{ $aluno->alergia_intolerancia ? 'Sim' : 'Não' }} @if ($aluno->descricao_alergia) — {{ $aluno->descricao_alergia }} @endif</td></tr>
        <tr><th>Autorizações</th><td>
            Fotos/redes: {{ $aluno->autorizacao_fotos_redes ? 'Sim' : 'Não' }} ·
            Passeios: {{ $aluno->autorizacao_passeios ? 'Sim' : 'Não' }} ·
            Areia: {{ $aluno->pode_brincar_areia ? 'Sim' : 'Não' }}
        </td></tr>
        <tr><th>Observações</th><td>{{ $aluno->responsaveis_retirada ?: '—' }}</td></tr>
    </table>
</body>
</html>
