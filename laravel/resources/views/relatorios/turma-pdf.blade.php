<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>Frequência da turma</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #212529; font-size: 12px; }
        h1 { font-size: 18px; margin: 0; }
        .muted { color: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #dee2e6; padding: 6px 8px; text-align: left; }
        th { background: #f1f3f5; }
        .critico { color: #dc3545; font-weight: bold; }
        .atencao { color: #fd7e14; }
        header { border-bottom: 2px solid #0d6efd; padding-bottom: 8px; margin-bottom: 12px; }
    </style>
</head>
<body>
    <header>
        <h1>Relatório de Frequência — {{ $turma->nome }}</h1>
        <div class="muted">
            Turno: {{ $turma->turno ?: '—' }} · Ano letivo: {{ $turma->ano_letivo ?: '—' }} ·
            Professoras: {{ $professoras->pluck('nome')->implode(', ') ?: '—' }}
        </div>
        <div class="muted">Emitido em {{ now()->format('d/m/Y H:i') }}</div>
    </header>

    <table>
        <thead>
            <tr>
                <th>Aluno</th>
                <th>Presenças</th>
                <th>Faltas</th>
                <th>% Presença</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($linhas as $linha)
                <tr>
                    <td>{{ $linha['aluno']->nome }}</td>
                    <td>{{ $linha['presentes'] }}</td>
                    <td>{{ $linha['faltas'] }}</td>
                    <td class="{{ $linha['percentual'] === null ? '' : ($linha['percentual'] < 60 ? 'critico' : ($linha['percentual'] < 75 ? 'atencao' : '')) }}">
                        {{ $linha['percentual'] === null ? '—' : $linha['percentual'].'%' }}
                    </td>
                </tr>
            @empty
                <tr><td colspan="4">Nenhum aluno nesta turma.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
