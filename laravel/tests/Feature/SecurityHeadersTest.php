<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    public function test_responses_include_security_headers(): void
    {
        $this->get('/login')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('X-Permitted-Cross-Domain-Policies', 'none');
    }

    public function test_hsts_is_only_sent_over_https(): void
    {
        $this->get('/login')->assertHeaderMissing('Strict-Transport-Security');

        $this->get('https://localhost/login')->assertHeader('Strict-Transport-Security');
    }

    public function test_https_is_detected_from_forwarded_header_of_trusted_proxy(): void
    {
        // Atrás de proxy (Cloudflare Tunnel/nginx) o TLS termina no proxy e o
        // pedido chega em http, com X-Forwarded-Proto: https.
        $response = $this->withServerVariables(['HTTP_X_FORWARDED_PROTO' => 'https'])
            ->get('/login');

        $response->assertHeader('Strict-Transport-Security');

        // As URLs geradas precisam sair como https, senão o Livewire tentaria
        // postar em http (bloqueio de mixed content no navegador).
        $secureUrl = preg_replace('/^http:/', 'https:', (string) config('app.url'));

        $response->assertSee($secureUrl.'/livewire', false);
    }
}
