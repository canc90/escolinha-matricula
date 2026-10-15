<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title ?? 'Gestão Escolar' }}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
    <style>
        body { min-height: 100vh; }
        .navbar-brand { font-weight: 600; }
        .card-stat .display-6 { font-weight: 700; }
    </style>
    @livewireStyles
</head>
<body class="bg-light">
@auth
<nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
    <div class="container-fluid">
        <a class="navbar-brand" href="{{ auth()->user()->isAdmin() ? route('dashboard') : route('dashboard.professora') }}">
            <i class="bi bi-mortarboard-fill"></i> Gestão Escolar
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                @if (auth()->user()->isAdmin())
                    <li class="nav-item"><a class="nav-link" href="{{ route('dashboard') }}"><i class="bi bi-speedometer2"></i> Início</a></li>
                @endif
                <li class="nav-item"><a class="nav-link" href="{{ route('alunos.index') }}"><i class="bi bi-people"></i> Alunos</a></li>
                <li class="nav-item"><a class="nav-link" href="{{ route('professoras.index') }}"><i class="bi bi-person-badge"></i> Professoras</a></li>
                <li class="nav-item"><a class="nav-link" href="{{ route('turmas.index') }}"><i class="bi bi-diagram-3"></i> Turmas</a></li>
                <li class="nav-item"><a class="nav-link" href="{{ route('diario.index') }}"><i class="bi bi-journal-text"></i> Diário</a></li>
                <li class="nav-item"><a class="nav-link" href="{{ route('frequencias.index') }}"><i class="bi bi-check2-square"></i> Frequências</a></li>
                @if (auth()->user()->isAdmin())
                    <li class="nav-item"><a class="nav-link" href="{{ route('importacao') }}"><i class="bi bi-upload"></i> Importação</a></li>
                    <li class="nav-item"><a class="nav-link" href="{{ route('ia') }}"><i class="bi bi-robot"></i> IA</a></li>
                    <li class="nav-item"><a class="nav-link" href="{{ route('direcao') }}"><i class="bi bi-bar-chart"></i> Direção</a></li>
                    <li class="nav-item"><a class="nav-link" href="{{ route('users.index') }}"><i class="bi bi-gear"></i> Usuários</a></li>
                @endif
            </ul>
            <div class="d-flex align-items-center text-white">
                <span class="me-3 small">
                    <i class="bi bi-person-circle"></i> {{ auth()->user()->name }}
                    <span class="badge text-bg-light ms-1">{{ auth()->user()->role }}</span>
                </span>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button class="btn btn-sm btn-outline-light" type="submit">
                        <i class="bi bi-box-arrow-right"></i> Sair
                    </button>
                </form>
            </div>
        </div>
    </div>
</nav>
@endauth

<main class="container-fluid py-4">
    @if (session('status'))
        <div class="alert alert-success alert-dismissible fade show">
            {{ session('status') }}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    @endif

    {{ $slot }}
</main>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
@livewireScripts
</body>
</html>
