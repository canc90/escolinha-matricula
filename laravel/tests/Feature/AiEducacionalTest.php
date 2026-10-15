<?php

namespace Tests\Feature;

use App\Models\Turma;
use App\Services\AiEducacional;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiEducacionalTest extends TestCase
{
    use RefreshDatabase;

    private function risco(int $percentual): array
    {
        return ['percentual' => $percentual, 'nivel' => 'CRITICO'];
    }

    public function test_recommendation_uses_gemini_when_configured(): void
    {
        config()->set('services.gemini.key', 'test-key');
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    ['content' => ['parts' => [['text' => 'Recomendação gerada pela IA.']]]],
                ],
            ]),
        ]);

        $turma = Turma::create(['nome' => 'Turma IA', 'turno' => 'Manhã']);

        $texto = app(AiEducacional::class)->recomendarTurma($turma, $this->risco(50));

        $this->assertSame('Recomendação gerada pela IA.', $texto);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'generateContent')
            && $request['contents'][0]['parts'][0]['text'] !== '');
    }

    public function test_recommendation_falls_back_without_api_key(): void
    {
        config()->set('services.gemini.key', null);
        Http::fake();

        $turma = Turma::create(['nome' => 'Turma Local']);

        $texto = app(AiEducacional::class)->recomendarTurma($turma, $this->risco(48));

        $this->assertStringContainsString('48%', $texto);
        $this->assertStringContainsString('Turma Local', $texto);
        Http::assertNothingSent();
    }

    public function test_recommendation_falls_back_when_gemini_fails(): void
    {
        config()->set('services.gemini.key', 'test-key');
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response('erro', 500),
        ]);

        $turma = Turma::create(['nome' => 'Turma Erro']);

        $texto = app(AiEducacional::class)->recomendarTurma($turma, $this->risco(30));

        $this->assertStringContainsString('Turma Erro', $texto);
    }
}
