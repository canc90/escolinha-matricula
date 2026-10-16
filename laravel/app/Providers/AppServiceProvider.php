<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Limite padrão da API: 60 requisições por minuto, por usuário (ou IP).
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->getAuthIdentifier() ?: $request->ip()));

        $this->configureTrustedProxies();
    }

    /**
     * Confia nos proxies (Cloudflare Tunnel em dev, nginx em produção) para
     * detectar HTTPS e gerar URLs corretas a partir dos cabeçalhos X-Forwarded-*.
     *
     * Precisa rodar aqui, e não em bootstrap/app.php: aquele closure é
     * executado antes do .env ser carregado, quando env() ainda retorna null.
     */
    private function configureTrustedProxies(): void
    {
        $proxies = config('app.trusted_proxies');

        if (blank($proxies)) {
            return;
        }

        if (is_string($proxies) && $proxies !== '*') {
            $proxies = array_map('trim', explode(',', $proxies));
        }

        TrustProxies::at($proxies);
    }
}
