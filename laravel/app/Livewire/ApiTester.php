<?php

namespace App\Livewire;

use Livewire\Attributes\Layout;
use Livewire\Attributes\Title;
use Livewire\Component;

/**
 * Ferramenta de diagnóstico: dispara chamadas reais para a API v1
 * a partir do navegador e exibe o JSON de resposta.
 */
#[Layout('layouts::app')]
#[Title('Testar API')]
class ApiTester extends Component
{
    public function render()
    {
        return view('livewire.api-tester', [
            'baseUrl' => url('/api/v1'),
        ]);
    }
}
