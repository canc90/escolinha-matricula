<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

class RotacaoDeLogsTest extends TestCase
{
    /**
     * Diretório temporário deste teste (cada teste monta o seu).
     */
    private string $diretorio;

    protected function setUp(): void
    {
        parent::setUp();

        $this->diretorio = storage_path('framework/testing/'.Str::random(10));
        File::ensureDirectoryExists($this->diretorio);

        $this->beforeApplicationDestroyed(function (): void {
            File::deleteDirectory($this->diretorio);
        });
    }

    /**
     * Test 1 (default de CÓDIGO, independente do .env): o arquivo de config
     * resolve o canal `stack` em ['daily'] mesmo quando LOG_STACK está no
     * ambiente trazendo 'single' (o .env de dev não é fonte da verdade aqui),
     * porque o .env não é versionado e um template antigo voltaria a gravar
     * um laravel.log único e sem limite.
     */
    public function test_default_de_codigo_do_stack_e_o_canal_daily(): void
    {
        $envSalvo = $_ENV['LOG_STACK'] ?? null;
        $serverSalvo = $_SERVER['LOG_STACK'] ?? null;

        try {
            unset($_ENV['LOG_STACK'], $_SERVER['LOG_STACK']);
            putenv('LOG_STACK');

            $config = require config_path('logging.php');

            $this->assertSame(
                ['daily'],
                $config['channels']['stack']['channels'],
                'O default de CÓDIGO do canal stack precisa ser daily (rotação diária), sem depender do .env.',
            );
        } finally {
            if ($envSalvo !== null) {
                $_ENV['LOG_STACK'] = $envSalvo;
            }
            if ($serverSalvo !== null) {
                $_SERVER['LOG_STACK'] = $serverSalvo;
            }
            putenv('LOG_STACK'.(is_string($envSalvo) ? '='.$envSalvo : ''));
        }
    }

    /**
     * Test 2 (rotação + retenção de verdade): plantar retenção + 10 arquivos
     * datados antigos e escrever UMA vez no canal daily — a primeira escrita,
     * com o arquivo do dia ainda inexistente, dispara a rotação do
     * RotatingFileHandler, que poda para manter só os arquivos mais novos.
     * O total depende estritamente de `max_files`; se a retenção sumir do config,
     * o teste REPROVA (fail), nunca pula em silêncio.
     */
    public function test_a_retensao_poda_os_arquivos_antigos_de_verdade(): void
    {
        $retencao = (int) config('logging.channels.daily.max_files');

        if ($retencao < 1) {
            $this->fail('A retenção do canal daily precisa estar configurada (max_files).');
        }

        config(['logging.channels.daily.path' => $this->diretorio.'/laravel.log']);
        Log::forgetChannel('daily');

        for ($i = 1; $i <= $retencao + 10; $i++) {
            File::put(sprintf('%s/laravel-2020-01-%02d.log', $this->diretorio, $i), "arquivo velho $i\n");
        }

        Log::channel('daily')->info('sonda de rotacao e retencao');

        $arquivos = File::glob($this->diretorio.'/laravel-*.log');

        $this->assertCount(
            $retencao,
            $arquivos,
            "A poda precisa manter exatamente {$retencao} arquivos (rotação real, não leitura de config).",
        );
        $this->assertFileExists(
            $this->diretorio.'/laravel-'.now()->format('Y-m-d').'.log',
            'O arquivo do dia precisa existir depois da escrita.',
        );
        $this->assertFileDoesNotExist(
            sprintf('%s/laravel-2020-01-%02d.log', $this->diretorio, 1),
            'O arquivo mais antigo plantado precisa ter sido removido pela rotação.',
        );
    }

    /**
     * Test 3 (nível efetivo do canal de alerta): o canal `alertas` tem level
     * FIXO em `warning` (independente de LOG_LEVEL), para um ambiente com
     * LOG_LEVEL=error não engolir o alerta em silêncio. Escrevendo `info` e
     * `warning` no MESMO canal, só o warning pode aparecer no arquivo.
     */
    public function test_o_canal_de_alertas_aplica_o_nivel_warning(): void
    {
        config(['logging.channels.alertas.path' => $this->diretorio.'/alertas.log']);
        Log::forgetChannel('alertas');

        Log::channel('alertas')->info('registro de nivel insuficiente');
        Log::channel('alertas')->warning('ALERTA-DE-TESTE');

        $arquivos = File::glob($this->diretorio.'/alertas-*.log');

        $this->assertNotEmpty(
            $arquivos,
            'O warning precisa ter sido gravado no arquivo datado do canal alertas.',
        );

        $conteudo = (string) File::get($arquivos[0]);

        $this->assertStringContainsString(
            'ALERTA-DE-TESTE',
            $conteudo,
            'O registro em warning precisa aparecer no canal alertas.',
        );
        $this->assertStringNotContainsString(
            'registro de nivel insuficiente',
            $conteudo,
            'O level fixo warning precisa FILTRAR o info (o nível é efetivo, não decorativo).',
        );
    }
}
