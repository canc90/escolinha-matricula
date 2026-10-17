<?php

use App\Services\RiskEngine;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Gera alertas automáticos de frequência diariamente
Schedule::call(function () {
    app(RiskEngine::class)->gerarAlertas();
})->daily()->description('Gera alertas automáticos de frequência');

// Backup diário do banco e dos uploads. Às 02:30 para não colidir com o job de
// alertas (meia-noite) e rodar fora do horário de uso da escola.
Schedule::command('escola:backup')
    ->dailyAt('02:30')
    ->withoutOverlapping(30)
    ->description('Backup diário do banco e dos uploads');
