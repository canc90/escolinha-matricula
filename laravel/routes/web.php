<?php

use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\RelatorioController;
use App\Livewire\Alunos\AlunoForm;
use App\Livewire\Alunos\AlunoShow;
use App\Livewire\Alunos\AlunosIndex;
use App\Livewire\ApiTester;
use App\Livewire\Auth\Login;
use App\Livewire\Dashboard;
use App\Livewire\DashboardPedagogico;
use App\Livewire\DashboardProfessora;
use App\Livewire\Diario\DiarioIndex;
use App\Livewire\Direcao;
use App\Livewire\Frequencias\FrequenciasIndex;
use App\Livewire\IaEducacional;
use App\Livewire\Importacao;
use App\Livewire\Professoras\ProfessoraForm;
use App\Livewire\Professoras\ProfessorasIndex;
use App\Livewire\Turmas\TurmaForm;
use App\Livewire\Turmas\TurmasIndex;
use App\Livewire\Users\UserForm;
use App\Livewire\Users\UsersIndex;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login');

Route::get('/login', Login::class)->name('login')->middleware('guest');

Route::post('/logout', LogoutController::class)->name('logout');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', Dashboard::class)->name('dashboard');
    Route::get('/dashboard-professora', DashboardProfessora::class)->name('dashboard.professora');
    Route::get('/dashboard-pedagogico', DashboardPedagogico::class)->name('dashboard.pedagogico');

    // Alunos
    Route::get('/alunos', AlunosIndex::class)->name('alunos.index');
    Route::get('/alunos/novo', AlunoForm::class)->name('alunos.create');
    Route::get('/alunos/{aluno}/editar', AlunoForm::class)->name('alunos.edit');
    Route::get('/alunos/{aluno}', AlunoShow::class)->name('alunos.show');

    // Professoras
    Route::get('/professoras', ProfessorasIndex::class)->name('professoras.index');
    Route::get('/professoras/nova', ProfessoraForm::class)->name('professoras.create');
    Route::get('/professoras/{professora}/editar', ProfessoraForm::class)->name('professoras.edit');

    // Turmas
    Route::get('/turmas', TurmasIndex::class)->name('turmas.index');
    Route::get('/turmas/nova', TurmaForm::class)->name('turmas.create');
    Route::get('/turmas/{turma}/editar', TurmaForm::class)->name('turmas.edit');

    // Diário e frequências
    Route::get('/diario', DiarioIndex::class)->name('diario.index');
    Route::get('/frequencias', FrequenciasIndex::class)->name('frequencias.index');

    // Relatórios
    Route::get('/relatorios/alunos/{aluno}/pdf', [RelatorioController::class, 'alunoPdf'])->name('relatorios.aluno.pdf');
    Route::get('/relatorios/turmas/{turma}/pdf', [RelatorioController::class, 'turmaPdf'])->name('relatorios.turma.pdf');
    Route::get('/relatorios/turmas/{turma}/csv', [RelatorioController::class, 'turmaCsv'])->name('relatorios.turma.csv');

    // Área administrativa
    Route::middleware('role:admin')->group(function () {
        Route::get('/direcao', Direcao::class)->name('direcao');
        Route::get('/ia-educacional', IaEducacional::class)->name('ia');
        Route::get('/importacao', Importacao::class)->name('importacao');
        Route::get('/api-tester', ApiTester::class)->name('api.tester');

        Route::get('/users', UsersIndex::class)->name('users.index');
        Route::get('/users/novo', UserForm::class)->name('users.create');
        Route::get('/users/{user}/editar', UserForm::class)->name('users.edit');
    });
});
