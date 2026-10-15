<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Gera alertas automáticos de frequência diariamente
Schedule::call(function () {
    app(\App\Services\RiskEngine::class)->gerarAlertas();
})->daily()->description('Gera alertas automáticos de frequência');
