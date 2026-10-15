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
}
