<?php

namespace Tests\Feature;

use App\Services\Observabilidade\NotificadorDeErros;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Request as RequisicaoHttp;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class AlertaErroServidorTest extends TestCase
{
    /**
     * Arquivo temporário do canal `alertas` deste teste.
     */
    private string $arquivoAlertas;

    protected function setUp(): void
    {
        parent::setUp();

        // O canal real é `daily`; no teste apontamos para um `single` com o
        // nome exato do arquivo temporário, em storage/framework/testing/...
        $this->arquivoAlertas = storage_path('framework/testing/'.Str::random(10).'/alertas.log');
        File::ensureDirectoryExists(dirname($this->arquivoAlertas));

        $this->beforeApplicationDestroyed(function (): void {
            File::deleteDirectory(dirname($this->arquivoAlertas));
        });
    }

    /**
     * Aponta o canal `alertas` para o arquivo temporário do teste e re-resolve
     * o canal (o LogManager guarda o canal já resolvido em memória).
     */
    private function apontarAlertas(): void
    {
        config(['logging.channels.alertas.driver' => 'single']);
        config(['logging.channels.alertas.path' => $this->arquivoAlertas]);
        config(['logging.channels.alertas.level' => 'debug']);
        Log::forgetChannel('alertas');
    }

    /**
     * Registra uma rota temporária que lança RuntimeException (ou faz
     * abort($status), que é HttpException) — o 5xx sai renderizado, exatamente
     * como em produção, desde que o teste NÃO use withoutExceptionHandling.
     */
    private function rotaQueFalha(string $caminho, ?int $status = null, string $metodo = 'get'): void
    {
        $metodo = in_array($metodo, ['get', 'post', 'postJson'], true) ? $metodo : 'get';

        if (str_starts_with((string) $metodo, 'post')) {
            Route::post($caminho, function () use ($status) {
                if ($status !== null) {
                    abort($status, 'erro de sonda');
                }

                throw new RuntimeException('erro de sonda');
            });

            return;
        }

        Route::get($caminho, function () use ($status, $caminho) {
            if ($status !== null) {
                abort($status, 'erro de sonda');
            }

            throw new RuntimeException('erro de sonda: '.$caminho);
        });
    }

    public function test_erro_5xx_em_rota_web_dispara_o_post_no_webhook(): void
    {
        $this->apontarAlertas();
        $url = 'http://127.0.0.1:9977/webhook/escola';
        config(['escola.alertas.webhook_url' => $url]);
        Http::fake();

        $this->rotaQueFalha('/_sonda/web');
        $resposta = $this->get('/_sonda/web');

        $resposta->assertStatus(500);

        Http::assertSent(function (RequisicaoHttp $req) use ($url) {
            return $req->url() === $url
                && $req->isJson()
                && $req['aplicacao'] === config('app.name')
                && $req['ambiente'] === 'testing'
                && $req['status'] === 500
                && $req['classe'] === RuntimeException::class
                && str_contains((string) $req['mensagem'], 'erro de sonda')
                && $req['metodo'] === 'GET'
                && $req['rota'] === '_sonda/web'
                && str_contains((string) $req['ocorrido_em'], (string) now()->year);
        });
    }

    public function test_erro_5xx_em_rota_de_api_tambem_dispara_o_post(): void
    {
        $this->apontarAlertas();
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/api']);
        Http::fake();

        $this->rotaQueFalha('/api/sondas/500');
        $resposta = $this->getJson('/api/sondas/500');

        $resposta->assertStatus(500);

        Http::assertSent(fn (RequisicaoHttp $req) => $req['status'] === 500
            && $req['rota'] === 'api/sondas/500');
    }

    public function test_abort_503_dispara_o_alerta_por_status_final(): void
    {
        $this->apontarAlertas();
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/503']);
        Http::fake();

        // HttpException com abort: report() NÃO pegaria esse caso
        // (internalDontReport), respond() vê o status e dispara.
        $this->rotaQueFalha('/_sonda/503', 503);
        $resposta = $this->get('/_sonda/503');

        $resposta->assertStatus(503);

        Http::assertSent(fn (RequisicaoHttp $req) => $req['status'] === 503
            && $req['classe'] === HttpException::class
            && $req['rota'] === '_sonda/503');
    }

    public function test_404_nao_dispara_nenhum_alerta(): void
    {
        $this->apontarAlertas();
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/404']);
        Http::fake();

        $this->get('/caminho-que-nao-existe')->assertStatus(404);

        Http::assertNothingSent();
    }

    public function test_erro_de_validacao_422_nao_dispara_nenhum_alerta(): void
    {
        $this->apontarAlertas();
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/422']);
        Http::fake();

        Route::post('/api/sondas/validacao', function () {
            throw ValidationException::withMessages(['nome' => ['O campo nome é obrigatório.']]);
        });

        $resposta = $this->postJson('/api/sondas/validacao');

        $resposta->assertStatus(422);

        Http::assertNothingSent();
    }

    public function test_sem_webhook_configurado_o_alerta_vai_para_o_canal_dedicado(): void
    {
        // Rotas distintas por iteração: a assinatura é status + classe + rota,
        // então o MESMO caminho na segunda iteração seria suprimido pela
        // deduplicação (o cache array persiste no processo da suíte) e o
        // teste acusaria ausência de alerta por motivo errado.
        foreach ([null, ''] as $i => $url) {
            File::delete($this->arquivoAlertas);
            config(['escola.alertas.webhook_url' => $url]);

            $this->apontarAlertas();
            $this->rotaQueFalha('/_sonda/sem-url-'.$i);
            $resposta = $this->get('/_sonda/sem-url-'.$i);

            $resposta->assertStatus(500);
            Http::assertNothingSent(); // com URL vazia nada sai da aplicação

            $conteudo = (string) File::get($this->arquivoAlertas);

            $this->assertStringContainsString('erro de sonda', $conteudo);
            $this->assertStringContainsString('RuntimeException', $conteudo);
            $this->assertStringContainsString('webhook não configurado', $conteudo);
        }
    }

    public function test_falha_http_do_webhook_nao_derruba_a_requisicao_e_registra_host_mascarado(): void
    {
        $this->apontarAlertas();
        $url = 'http://127.0.0.1:9977/webhook/ruim';
        config(['escola.alertas.webhook_url' => $url]);
        Http::fake([$url => Http::response('erro', 500)]);

        $this->rotaQueFalha('/_sonda/http-fail');
        $resposta = $this->get('/_sonda/http-fail');

        // O usuário segue recebendo o 500 original — a falha na ENTREGA do
        // alerta não pode virar outro erro no caminho da resposta.
        $resposta->assertStatus(500);

        Http::assertSent(fn (RequisicaoHttp $req) => $req->url() === $url);

        $conteudo = (string) File::get($this->arquivoAlertas);

        $this->assertStringContainsString('codigo de erro', $conteudo);
        $this->assertStringContainsString('127.0.0.1:9977', $conteudo);
        $this->assertStringNotContainsString($url, $conteudo, 'A URL completa não pode ir para o log.');
    }

    public function test_falha_de_conexao_nao_derruba_a_requisicao(): void
    {
        $this->apontarAlertas();
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/morto']);
        Http::fake(function () {
            throw new ConnectionException('tempo esgotado');
        });

        $this->rotaQueFalha('/_sonda/conn-fail');
        $resposta = $this->get('/_sonda/conn-fail');

        $resposta->assertStatus(500);

        $conteudo = (string) File::get($this->arquivoAlertas);

        $this->assertStringContainsString('conexao ou tempo esgotado', $conteudo);
        $this->assertStringContainsString('tempo esgotado', $conteudo);
    }

    public function test_dedupe_suprime_repetidos_expira_e_deixa_breadcrumb_no_canal_padrao(): void
    {
        $this->apontarAlertas();
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/dedup']);
        config(['escola.alertas.dedup_minutos' => 10]);
        Http::fake();

        // Alvo DETERMINÍSTICO para o canal PADRÃO (o breadcrumb de supressão),
        // independente do .env: forçamos a cadeia stack -> single -> arquivo
        // temporário com level warning, que espelha LOG_LEVEL=warning de
        // produção — um breadcrumb em debug seria descartado e o teste
        // reprovaria (prova que o nível sobrevive).
        $arquivoPadrao = storage_path('framework/testing/'.Str::random(10).'/padrao.log');
        File::ensureDirectoryExists(dirname($arquivoPadrao));
        config([
            'logging.channels.stack.channels' => ['single'],
            'logging.channels.single.path' => $arquivoPadrao,
            'logging.channels.single.level' => 'warning',
        ]);
        // Depois que o `stack` foi resolvido, esquecer só o subcanal NÃO
        // re-roteia — precisamos esquecer os dois.
        Log::forgetChannel('stack');
        Log::forgetChannel('single');

        $this->beforeApplicationDestroyed(function () use ($arquivoPadrao): void {
            File::deleteDirectory(dirname($arquivoPadrao));
        });

        $this->rotaQueFalha('/_sonda/repetido');
        $this->get('/_sonda/repetido')->assertStatus(500);
        $this->get('/_sonda/repetido')->assertStatus(500);
        $this->get('/_sonda/repetido')->assertStatus(500);

        // O MESMO erro na mesma janela: apenas UM POST.
        Http::assertSentCount(1);

        $breadcrumb = (string) File::get($arquivoPadrao);

        $this->assertStringContainsString('suprimido por deduplicacao', $breadcrumb);
        $this->assertStringContainsString('RuntimeException', $breadcrumb);
        $this->assertStringContainsString('_sonda/repetido', $breadcrumb);

        // Expirada a janela (10 min), o mesmo erro volta a notificar.
        $this->travel(11)->minutes();
        $this->get('/_sonda/repetido')->assertStatus(500);

        Http::assertSentCount(2);
    }

    public function test_erros_distintos_sao_alertas_nao_suprimidos(): void
    {
        $this->apontarAlertas();
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/distintos']);
        Http::fake();

        $this->rotaQueFalha('/_sonda/a');
        $this->rotaQueFalha('/_sonda/b');
        $this->get('/_sonda/a')->assertStatus(500);
        $this->get('/_sonda/b')->assertStatus(500);

        // Rotas distintas = assinaturas distintas: dois POSTs.
        Http::assertSentCount(2);
    }

    public function test_o_teto_global_manda_o_excedente_para_o_log_nao_para_o_webhook(): void
    {
        $this->apontarAlertas();
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/teto']);
        config(['escola.alertas.max_por_hora' => 1]);
        Http::fake();

        $this->rotaQueFalha('/_sonda/teto-1');
        $this->rotaQueFalha('/_sonda/teto-2');
        $this->get('/_sonda/teto-1')->assertStatus(500);
        $this->get('/_sonda/teto-2')->assertStatus(500);

        // Somente o primeiro erro passa; o segundo vira registro no canal.
        Http::assertSentCount(1);

        $conteudo = (string) File::get($this->arquivoAlertas);

        $this->assertStringContainsString('limite global de alertas por hora excedido', $conteudo);
        $this->assertStringContainsString('_sonda/teto-2', $conteudo);
    }

    public function test_a_url_do_webhook_e_um_segredo_nunca_logada(): void
    {
        $this->apontarAlertas();
        $url = 'http://127.0.0.1:9977/webhook/TOKEN-SECRETO?chave=XYZ';
        config(['escola.alertas.webhook_url' => $url]);
        Http::fake([$url => Http::response('erro', 500)]);

        $this->rotaQueFalha('/_sonda/segredo');
        $this->get('/_sonda/segredo')->assertStatus(500);

        Http::assertSentCount(1);

        $conteudo = (string) File::get($this->arquivoAlertas);

        $this->assertStringNotContainsString('TOKEN-SECRETO', $conteudo, 'O token da URL não pode vazar em log.');
        $this->assertStringNotContainsString('chave=XYZ', $conteudo, 'A query string não pode vazar em log.');
        $this->assertStringContainsString('127.0.0.1:9977', $conteudo, 'O host e a porta SÃO o que pode aparecer.');
    }

    public function test_o_pedido_do_alerta_tem_timeouts_explicitos_do_config(): void
    {
        config(['escola.alertas.webhook_timeout' => 7]);
        config(['escola.alertas.webhook_connect_timeout' => 3]);

        $capturado = null;
        $sonda = new class extends NotificadorDeErros
        {
            public ?PendingRequest $pendente = null;

            /**
             * Expondo o `PendingRequest` montado: os timeouts são requisito de
             * robustez (um webhook sem resposta prende o worker) e não
             * aparecem no `Http::assertSent`, então confere-se pelas opções.
             */
            protected function requisicao(): PendingRequest
            {
                return $this->pendente = parent::requisicao();
            }
        };

        // Sem URL configurada o notificador NÃO monta a requisição (vai para o
        // log): o teste precisa configurar o webhook para exercitar
        // `requisicao()`.
        config(['escola.alertas.webhook_url' => 'http://127.0.0.1:9977/webhook/timeout']);
        Http::fake();

        $sonda->notificar(new RuntimeException('sonda de timeout'), null, 500);

        $this->assertNotNull($sonda->pendente, 'O notificador precisa ter montado a requisição.');

        $opcoes = \Closure::bind(function (): array {
            return $this->options;
        }, $sonda->pendente, PendingRequest::class)();

        $this->assertSame(7, $opcoes['timeout'], 'O timeout TOTAL precisa vir do config.');
        $this->assertSame(3, $opcoes['connect_timeout'], 'O timeout de CONEXÃO precisa vir do config.');

        config(['escola.alertas.webhook_timeout' => 9]);

        $this->assertNotSame(
            $opcoes['timeout'],
            (int) config('escola.alertas.webhook_timeout'),
            'O timeout precisa acompanhar o config (não pode ser constante decorativa).',
        );
    }
}
