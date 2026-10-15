<?php

namespace App\Services;

use App\Models\Turma;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Gera recomendações pedagógicas com apoio do Gemini.
 *
 * Quando a chave de API não está configurada (ou a chamada falha), recorre a
 * uma recomendação determinística baseada no nível de risco da turma.
 */
class AiEducacional
{
    public function isConfigured(): bool
    {
        return filled(config('services.gemini.key'));
    }

    /**
     * @param  array<string, mixed>  $risco
     */
    public function recomendarTurma(Turma $turma, array $risco): string
    {
        if (! $this->isConfigured()) {
            return $this->recomendacaoLocal($turma, $risco);
        }

        try {
            $texto = $this->consultarGemini($this->prompt($turma, $risco));
        } catch (Throwable $e) {
            Log::warning('Falha ao consultar o Gemini.', ['exception' => $e]);

            return $this->recomendacaoLocal($turma, $risco);
        }

        return $texto ?: $this->recomendacaoLocal($turma, $risco);
    }

    private function consultarGemini(string $prompt): ?string
    {
        $base = rtrim((string) config('services.gemini.base_url'), '/');
        $model = config('services.gemini.model');

        $response = Http::timeout(20)
            ->acceptJson()
            ->post("{$base}/models/{$model}:generateContent?key=".config('services.gemini.key'), [
                'contents' => [
                    ['parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'temperature' => 0.4,
                    'maxOutputTokens' => 512,
                ],
            ]);

        if ($response->failed()) {
            return null;
        }

        return data_get($response->json(), 'candidates.0.content.parts.0.text');
    }

    /**
     * @param  array<string, mixed>  $risco
     */
    private function prompt(Turma $turma, array $risco): string
    {
        $percentual = $risco['percentual'] ?? 'sem dados';
        $nivel = $risco['nivel'] ?? 'SEM_DADOS';

        return 'Você é um assistente pedagógico de uma escola infantil. '
            ."A turma \"{$turma->nome}\" (turno {$turma->turno}) está com {$percentual}% de presença, "
            ."classificada como risco {$nivel}. "
            .'Escreva, em português do Brasil, uma recomendação objetiva (máximo 3 frases) para a coordenação.';
    }

    /**
     * @param  array<string, mixed>  $risco
     */
    private function recomendacaoLocal(Turma $turma, array $risco): string
    {
        $percentual = $risco['percentual'] ?? null;
        $nivel = $risco['nivel'] ?? 'SEM_DADOS';

        if ($percentual === null) {
            return "Ainda não há registros de frequência suficientes para a turma {$turma->nome}.";
        }

        return match ($nivel) {
            'BAIXO' => "A turma {$turma->nome} mantém {$percentual}% de presença. Continue o acompanhamento e valorize a assiduidade.",
            'MEDIO' => "A turma {$turma->nome} está com {$percentual}% de presença. Monitore os alunos com faltas recorrentes.",
            'ALTO' => "A turma {$turma->nome} está com {$percentual}% de presença. Contate os responsáveis e registre as justificativas.",
            default => "A turma {$turma->nome} está em situação crítica ({$percentual}% de presença). Acione a coordenação e o conselho escolar.",
        };
    }
}
