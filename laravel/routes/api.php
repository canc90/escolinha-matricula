<?php

use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\AlunoController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProfessoraController;
use App\Http\Controllers\Api\TurmaController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:6,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);

        Route::get('dashboard', DashboardController::class);

        Route::get('alunos', [AlunoController::class, 'index']);
        Route::get('alunos/{aluno}', [AlunoController::class, 'show']);
        Route::get('professoras', [ProfessoraController::class, 'index']);
        Route::get('professoras/{professora}', [ProfessoraController::class, 'show']);
        Route::get('turmas', [TurmaController::class, 'index']);
        Route::get('turmas/{turma}', [TurmaController::class, 'show']);
        Route::get('alerts', [AlertController::class, 'index']);

        Route::middleware('role:admin')->group(function () {
            Route::post('alunos', [AlunoController::class, 'store']);
            Route::match(['put', 'patch'], 'alunos/{aluno}', [AlunoController::class, 'update']);
            Route::delete('alunos/{aluno}', [AlunoController::class, 'destroy']);

            Route::post('professoras', [ProfessoraController::class, 'store']);
            Route::match(['put', 'patch'], 'professoras/{professora}', [ProfessoraController::class, 'update']);
            Route::delete('professoras/{professora}', [ProfessoraController::class, 'destroy']);

            Route::post('turmas', [TurmaController::class, 'store']);
            Route::match(['put', 'patch'], 'turmas/{turma}', [TurmaController::class, 'update']);
            Route::delete('turmas/{turma}', [TurmaController::class, 'destroy']);

            Route::post('alerts/gerar', [AlertController::class, 'gerar']);
            Route::post('alerts/{alert}/resolver', [AlertController::class, 'resolver']);
        });
    });
});
