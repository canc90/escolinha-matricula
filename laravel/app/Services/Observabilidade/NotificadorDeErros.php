<?php

namespace App\Services\Observabilidade;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * Envia o alerta de erro 5xx para um webhook configurável (n8n, Slack, etc.)
 * e, quando não há webhook ou a entrega falha, grava o alerta no canal de log
 * dedicado `alertas` — nada é perdido em silêncio.
 *
 * É chamado de DENTRO do ciclo da requisição (pelo hook `$exceptions->respond()`
 * em bootstrap/app.php): nenhuma exceção pode escapar daqui, senão a página de
 * erro do usuário quebra. Todo o corpo de `notificar()` vive dentro de um
 * try/catch, e até o registro de falha de log engole a própria falha.
 */
class NotificadorDeErros
{
    /**
     * Notifica um erro 5xx. Sem dependências de construtor: o config é lido na
     * hora da chamada, o que também permite ao teste trocar o canal por config.
     */
    public function notificar(Throwable $e, ?Request $request, int $status): void
    {
        try {
            $assinatura = $this->assinatura($e, $request, $status);

            if (! $this->dentroDoLimiteDeDuplicidade($assinatura)) {
                $this->registrarSupressao($e, $request, $status);

                return;
            }

            if (! $this->dentroDoLimiteGlobal()) {
                $this->registrarFalha('limite global de alertas por hora excedido', [
                    'status' => $status,
                    'classe' => $e::class,
                    'rota' => $request?->path(),
                ]);

                return;
            }

            $this->enviar($this->montarPayload($e, $request, $status));
        } catch (Throwable $falha) {
            $this->registrarFalha('o próprio notificador de erros 5xx falhou', [
                'motivo' => substr((string) $falha->getMessage(), 0, 500),
                'status' => $status,
                'classe' => $e::class,
            ]);
        }
    }

    /**
     * Assinatura do erro: precisa ser ESTÁVEL para o mesmo defeito, então usa
     * status + classe + rota e NÃO a mensagem (cada variação de texto viraria
     * um alerta novo).
     */
    protected function assinatura(Throwable $e, ?Request $request, int $status): string
    {
        return hash('sha256', $status.'|'.$e::class.'|'.($request?->path() ?? '-'));
    }

    /**
     * Deduplicação: `Cache::add` devolve false quando a chave já existe na
     * janela (ou seja, "já avisado"). true = pode notificar.
     */
    protected function dentroDoLimiteDeDuplicidade(string $assinatura): bool
    {
        try {
            return Cache::add('alerta:erro:'.$assinatura, 1, $this->minutos() * 60);
        } catch (Throwable $falha) {
            // Cache indisponível é fail-open: é melhor avisar demais do que
            // perder o alerta.
            $this->registrarFalha('cache de deduplicacao indisponivel', [
                'motivo' => substr((string) $falha->getMessage(), 0, 500),
            ]);

            return true;
        }
    }

    /**
     * Breadcrumb de dedup no canal PADRÃO (nunca no canal `alertas`, para não
     * parecer alerta e nem disparar webhook): o operador vê que houve
     * repetição. O nível é `warning`, não `debug`, porque em produção
     * `LOG_LEVEL=warning` descartaria o `debug` e a supressão voltaria a ser
     * silenciosa.
     */
    protected function registrarSupressao(Throwable $e, ?Request $request, int $status): void
    {
        try {
            Log::warning(
                'alerta de erro 5xx suprimido por deduplicacao (mesma assinatura): {status} {classe} {rota}',
                [
                    'status' => $status,
                    'classe' => $e::class,
                    'rota' => $request?->path(),
                ],
            );
        } catch (Throwable) {
            // Um breadcrumb nunca pode quebrar nada.
        }
    }

    /**
     * Teto global de alertas por hora (`RateLimiter` com janela de 3600 s).
     * true = dentro do limite (e já conta essa tentativa).
     */
    protected function dentroDoLimiteGlobal(): bool
    {
        try {
            if (RateLimiter::tooManyAttempts('observabilidade:alertas', $this->maxPorHora())) {
                return false;
            }

            RateLimiter::hit('observabilidade:alertas', 3600);

            return true;
        } catch (Throwable $falha) {
            $this->registrarFalha('medidor de limite global indisponivel', [
                'motivo' => substr((string) $falha->getMessage(), 0, 500),
            ]);

            return true;
        }
    }

    /**
     * Payload mínimo do alerta, com chaves em pt-BR. Deixam-se de fora headers,
     * cookies, corpo da requisição e stack trace: o objetivo é avisar, não
     * vazar dados de alunos nem encher o webhook.
     */
    protected function montarPayload(Throwable $e, ?Request $request, int $status): array
    {
        return [
            'aplicacao' => (string) config('app.name'),
            'ambiente' => (string) app()->environment(),
            'status' => $status,
            'classe' => $e::class,
            'mensagem' => mb_substr((string) $e->getMessage(), 0, 500),
            'arquivo' => (string) $e->getFile(),
            'linha' => $e->getLine(),
            'metodo' => $request?->method(),
            // Sem query string: ela pode carregar token.
            'rota' => $request?->path(),
            'usuario_id' => $request?->user()?->getAuthIdentifier(),
            'ocorrido_em' => now()->toIso8601String(),
        ];
    }

    /**
     * Entrega: POST no webhook ou, sem URL / com falha na entrega, registro no
     * canal de log dedicado. Tudo dentro de try/catch e nunca `throw`.
     */
    protected function enviar(array $payload): void
    {
        try {
            $url = $this->urlDoWebhook();

            if (blank($url)) {
                $this->registrarAlertaSemWebhook($payload);

                return;
            }

            $resposta = $this->requisicao()->post($url, $payload);

            if ($resposta->failed()) {
                $this->registrarFalha('o webhook devolveu um codigo de erro', [
                    'host' => $this->hostMascarado($url),
                    'codigo_http' => $resposta->status(),
                    'mensagem' => mb_substr((string) $payload['mensagem'], 0, 500),
                ]);
            }
        } catch (ConnectionException $falha) {
            $this->registrarFalha('a entrega do alerta falhou (conexao ou tempo esgotado)', [
                'host' => $this->hostMascarado($this->urlDoWebhook() ?? ''),
                'motivo' => substr((string) $falha->getMessage(), 0, 500),
            ]);
        } catch (Throwable $falha) {
            $this->registrarFalha('a entrega do alerta falhou', [
                'motivo' => substr((string) $falha->getMessage(), 0, 500),
            ]);
        }
    }

    /**
     * Fallback legível para o operador: a MENSAGEM do log traz a exceção, não
     * só o contexto — o `grep` do verify e o `tail` de produção encontram direto.
     */
    protected function registrarAlertaSemWebhook(array $payload): void
    {
        Log::channel($this->canalDeLog())->warning(
            'Alerta de erro 5xx (webhook não configurado): {classe}: {mensagem}',
            [
                'status' => $payload['status'],
                'classe' => $payload['classe'],
                'mensagem' => $payload['mensagem'],
                'meta' => $payload,
            ],
        );
    }

    /**
     * Pedido HTTP do alerta, com timeouts de conexão e total EXPLICITOS: o
     * vetor de ataque é justamente "sem timeout", onde um webhook fora do ar
     * prende o worker até esgotar. `protected` para o teste conferir as opções.
     */
    protected function requisicao(): PendingRequest
    {
        return Http::connectTimeout($this->tempoDeConexao())
            ->timeout($this->tempoTotal())
            ->acceptJson()
            ->asJson();
    }

    /**
     * Só esquema, host e porta podem ir para log — a URL completa pode estar
     * carregando um token do n8n/Slack e é um segredo.
     */
    protected function hostMascarado(string $url): string
    {
        $partes = parse_url($url);

        if (empty($partes['host'])) {
            return '(url inválida)';
        }

        $host = $partes['scheme'].'://'.$partes['host'];

        if (isset($partes['port'])) {
            $host .= ':'.$partes['port'];
        }

        return $host;
    }

    protected function canalDeLog(): string
    {
        return (string) config('escola.alertas.canal_log', 'alertas');
    }

    protected function urlDoWebhook(): ?string
    {
        $url = config('escola.alertas.webhook_url');

        return ($url === null || ! is_string($url) || trim($url) === '') ? null : $url;
    }

    protected function minutos(): int
    {
        return (int) config('escola.alertas.dedup_minutos', 10);
    }

    protected function maxPorHora(): int
    {
        return (int) config('escola.alertas.max_por_hora', 30);
    }

    protected function tempoTotal(): int
    {
        return (int) config('escola.alertas.webhook_timeout', 5);
    }

    protected function tempoDeConexao(): int
    {
        return (int) config('escola.alertas.webhook_connect_timeout', 2);
    }

    /**
     * Registro de falha no canal dedicado. Ele próprio engole exceções: se o
     * log falhar, não há mais onde registrar, e a requisição do usuário tem
     * prioridade.
     */
    protected function registrarFalha(string $motivo, array $contexto = []): void
    {
        try {
            Log::channel($this->canalDeLog())->error(
                'Entrega do alerta de erro 5xx falhou: {motivo}',
                ['motivo' => $motivo, 'meta' => $contexto],
            );
        } catch (Throwable) {
            // Sem mais onde registrar: prioridade é a requisição do usuário.
        }
    }
}
