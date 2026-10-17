<?php

use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use App\Services\Observabilidade\NotificadorDeErros;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureRole::class,
        ]);

        // Cabeçalhos de segurança em toda resposta.
        $middleware->append(SecurityHeaders::class);

        // Limite de requisições padrão (60/min) para toda a API.
        $middleware->throttleApi();

        // Obs.: os proxies confiáveis são configurados em AppServiceProvider::boot()
        // a partir de config('app.trusted_proxies'). Não use env() aqui: este
        // closure roda quando o HttpKernel é resolvido, antes do .env ser lido.
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // O alerta de erro 5xx é capturado por `respond()` (e não por
        // `report()`) porque este hook vê o STATUS FINAL da resposta já
        // renderizada: então um `abort(503)` — que é `HttpException`, ignorado
        // por `internalDontReport` em `report()` — também conta, um 404/422 não
        // dispara, e web e API passam pelo mesmo caminho. O callback devolve a
        // resposta RECEBIDA, intacta: ele nunca pode alterar a resposta do
        // usuário, e todo risco de exceção está contido no NotificadorDeErros.
        $exceptions->respond(function (SymfonyResponse $response, Throwable $e, Request $request) {
            if ($response->getStatusCode() >= 500) {
                app(NotificadorDeErros::class)->notificar($e, $request, $response->getStatusCode());
            }

            return $response;
        });
    })->create();
