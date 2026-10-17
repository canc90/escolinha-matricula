---
phase: 02-observabilidade-operacional
verified: 2026-10-17T12:05:00Z
status: passed
score: 13/13 must-haves verificados (+3 mutações adversariais próprias: 2 confirmaram as guardas, 1 expôs lacuna de falsificação num TESTE — não no código)
behavior_unverified: 0
covered_files:
  - .planning/phases/02-observabilidade-operacional/02-01-PLAN.md
  - .planning/phases/02-observabilidade-operacional/02-02-PLAN.md
  - .planning/phases/02-observabilidade-operacional/02-01-SUMMARY.md
  - .planning/phases/02-observabilidade-operacional/02-02-SUMMARY.md
  - laravel/config/logging.php
  - laravel/config/escola.php
  - laravel/app/Services/Observabilidade/NotificadorDeErros.php
  - laravel/bootstrap/app.php
  - laravel/tests/Feature/RotacaoDeLogsTest.php
  - laravel/tests/Feature/AlertaErroServidorTest.php
  - laravel/.env.example
  - laravel/.env.production.example
  - laravel/DEPLOY.md
---

# Phase 2: Observabilidade Operacional — Relatório de Verificação

**Goal da fase:** "A operação fica observável sem depender de ninguém abrindo o servidor: os logs rotacionam com retenção real e um erro 5xx avisa pelo canal configurado (webhook), com fallback em log — sem nunca derrubar a requisição do usuário."
**Verificado em:** 2026-10-17T12:05:00Z (09:05 America/Sao_Paulo) — commits `450b9dc` (02-01) e `fd5cfd3` (02-02).
**Status:** passed — os 13 must-haves (6 do 02-01 + 7 do 02-02) verificados com execução INDEPENDENTE própria (roteiro diferente dos verifies dos PLANs: pipeline HTTP completo via `Kernel::handle` em vez de `handler->render()`, receptores próprios em modo anexo para contagem de POSTs, mutações próprias). Mesma régua da fase 1: execução independente + falsifiabilidade de cada verify + itens de juízo humano.

## Goal Achievement

### Observable Truths

| # | Verdade (must-have) | Status | Evidência |
|---|---------------------|--------|-----------|
| 1 (02-01) | Canal `stack` aponta para `daily` (default de CÓDIGO `env('LOG_STACK','daily')` + nas duas `.example`) | ✓ VERIFIED | `config/logging.php:61` `explode(',', (string) env('LOG_STACK', 'daily'))` lido; `grep LOG_STACK=daily` nas duas `.example` ✓; **runtime real:** `php artisan tinker` no container dev resolve `config('logging.channels.stack.channels')` → `daily` (o `.env` de dev reflete produção; valor contado por chave, jamais impresso). |
| 2 (02-01) | Retenção REAL (poda do RotatingFileHandler), não leitura de config | ✓ VERIFIED | Sonda própria (datas censuradas válidas — a 1ª tentativa minha com `seq -w` gerou nomes `laravel-2024-101-01.log` inválidos e **não provou nada**; refiz com 22 arquivos `2020-*..2023-*` válidos): 1 escrita em `LOG_STACK=daily` → **22 → 14 arquivos**, `laravel-2026-10-17.log` criado com a data do APP (via tinker `now()`, não `date +%F` do shell UTC), `laravel-2020-05-01.log` e `laravel-2020-05-03.log` podados, os 13 mais novos preservados (`ls -1t` confirma). |
| 3 (02-01) | Retenção por ambiente: `LOG_DAILY_DAYS=3` → 3 | ✓ VERIFIED | Mesma sonda com `LOG_DAILY_DAYS=3`: `var_dump(config(...max_files))` → `int(3)` e 20 arquivos plantados → **sobram exatamente 3** (`2026-01-01`, `2026-02-02`, dia corrente). |
| 4 (02-01) | `LOG_DAILY_DAYS=0` e `=` (vazio) NÃO desligam a poda (cai no padrão 14) | ✓ VERIFIED | Com 20 arquivos válidos plantados: `LOG_DAILY_DAYS=0` → **14 restam**; `LOG_DAILY_DAYS=` (vazio) → **14 restam**; sem a variável → **14 restam**. É o `(int) (env('LOG_DAILY_DAYS') ?: 14)` (logging.php:80) executando de verdade. |
| 5 (02-01) | Canal dedicado `alertas` (daily, nível `warning` FIXO, retenção `LOG_DAILY_DAYS`) com nível efetivo | ✓ VERIFIED | `config/logging.php:89-95` lido (level `'warning'` literal, sem `LOG_LEVEL`); `RotacaoDeLogsTest` T3 ✓ na suíte (info descartado, warning gravado, no path real virtualizado); sonda própria: o fallback (truth 3 do 02-02, below) gravou uma linha `WARNING` no arquivo real `storage/logs/alertas-2026-10-17.log` — nível fixo ativo em runtime local (app). |
| 6 (02-01) | Número de arquivos limitado (teto em CONTAGEM; teto de bytes fora de escopo, como o plano declara) | ✓ VERIFIED | As sondas dos itens 2/3/4 provam poda repetida por nome de arquivo; `du -sh storage/logs` = 264K no dev. O plano é explícito quanto ao que NÃO se prova (bytes), então não há promessa quebrada. |
| 7 (02-02) | 5xx real dispara UM POST com status/classe/mensagem/rota/método; `abort(503)` (HttpException) dispara; 404 e 422 NÃO disparam | ✓ VERIFIED | **Sonda A (roteiro próprio, mais forte que o do plano):** rotas registradas em runtime + `$kernel->handle(Request::create(...))` = pipeline HTTP completo (middleware + hook `respond()`): `/v500` → resposta **500** e POST real recebido (`"status":500`, `RuntimeException`, mensagem, `_v500`, `GET`); `/_v503` (com `abort(503)`) → resposta **503** e POST com `"status":503`, classe `Symfony\...\HttpException`; `/inexistente` → **404** e **nenhum** POST; `/_v422` (ValidationException via POST JSON) → **422** e **nenhum** POST. Receptor: 2 payloads exatos para 4 requisições. |
| 8 (02-02) | Trocar o canal é só `ALERT_WEBHOOK_URL` no env (sem código); POST REAL com a variável trocada na linha de comando | ✓ VERIFIED | Os POSTs das sondas A/B/C saíram com `ALERT_WEBHOOK_URL=...` somente inline (nunca no código). `ALERT_WEBHOOK_URL=...9 ALERT_DEDUP_MINUTES=3 ALERT_MAX_PER_HOUR=7 ALERT_WEBHOOK_TIMEOUT=9 ALERT_WEBHOOK_CONNECT_TIMEOUT=4` inline → config devolve exatamente `...9977/e|3|7|9|4`; sem env → `''|10|30|5|5`. `config:show escola` lista o bloco `alertas` completo (executado). |
| 9 (02-02) | URL vazio: NÃO quebra, NÃO silencia — fallback no canal `alertas`, requisição continua 500 | ✓ VERIFIED | **Sonda D:** sem `ALERT_WEBHOOK_URL` inline (o `.env` dev traz vazio), `/_vfallback` → resposta **500**, receptor recebeu **0** payloads, e `storage/logs/alertas-2026-10-17.log` ganhou `WARNING: Alerta de erro 5xx (webhook não configurado): RuntimeException: sonda fallback de verificacao {...payload completo...}`. |
| 10 (02-02) | Falha de entrega (HTTP 500, timeout, conexão) NÃO derruba a requisição; host MASCARADO no log | ✓ VERIFIED | **Sonda E (timeout de verdade):** receptor que dorme 9 s + `ALERT_WEBHOOK_TIMEOUT=2` → a requisição do usuário terminou em **2,19 s** (não 9 s), resposta **500**, e o canal `alertas` registrou `ERROR: Entrega do alerta de erro 5xx falhou: a entrega do alerta falhou (conexao ou tempo esgotado) {"host":"http://127.0.0.1:9…"}`. **Sonda F (HTTP 500 do receptor):** resposta **500** + log `ERROR: ... o webhook devolveu um codigo de erro {"host":"http://127.0.0.1:9979","codigo_http":500,…}`. Falha de conexão coberta pelo Teste 8 ✓ na suíte (ConnectionException dublada). |
| 11 (02-02) | Dedup → UM POST + breadcrumb `warning` no canal PADRÃO; teto global manda excedente para o canal `alertas` | ✓ VERIFIED | **Sonda B:** 3 requisições em `/_vdup` no mesmo processo (`CACHE_STORE=array`) → receptor registrou **1** POST para `_vdup`, as 3 respostas 500, e o log real do dia (`laravel-2026-10-17.log`) ganhou **2** breadcrumbs `WARNING: alerta de erro 5xx suprimido por deduplicacao (mesma assinatura): 500 RuntimeException _vdup`. **Sonda C** (`ALERT_MAX_PER_HOUR=1`): `/vteto-1` e `/vteto-2` distintos → **1** POST (`_vteto-1`), e `alertas-day.log` registrou `ERROR: ... limite global de alertas por hora excedido {"rota":"_vteto-2"}`. Ambas as respostas ficaram 500. |
| 12 (02-02) | Timeouts total/de conexão explícitos no PendingRequest, lidos do config | ✓ VERIFIED (com ⚠️ quanto à FORÇA do Teste 13 — A-1 abaixo) | `requisicao()` (NotificadorDeErros.php:217) monta `Http::connectTimeout()->timeout()`; Teste 13 ✓ captura `options['timeout']=7 / connect_timeout=3` do config; a troca por env do item 8 prova que os valores seguem o ambiente. A **prova de comportamento real** é a minha sonda E: `ALERT_WEBHOOK_TIMEOUT=2` cortou um receptor de 9 s em 2,19 s. **Mas** o Teste 13 por si só aceitaria um timeout hardcoded (mutação provada — A-1). |
| 13 (02-02) | A URL completa (com token/query) é SEGREDO e nunca vai para log | ✓ VERIFIED | **Sonda F (sua própria receita de ata­que, receptor real):** `ALERT_WEBHOOK_URL=http://127.0.0.1:9979/webhook/TOKEN-SUPER-SECRETO?chave=XYZ&extra=plano` + receptor que devolve 500 → no log real do dia: `grep -c TOKEN-SUPER-SECRETO = 0`, `chave=XYZ = 0`, `extra=plano = 0`; `127.0.0.1:9979` presente (= 1, host mascarado é o que se aceita); `codigo_http:500` registrado. **Payload mínimo:** o receptor real capturou os JSONs das sondas A/B e contém **0** ocorrências de `user-agent/headers/HTTP_/stack/REMOTE_ADDR`; a rota vai sem query (`$request->path()`); payload = exatamente as 11 chaves do plano (`aplicacao…ocorrido_em`). |

**Score:** 13/13 must-haves verificados.

### Falsifiabilidade dos 16 testes novos (régua: "reprovaria com código quebrado?")

| Teste | Reprovare com quebra? | Análise |
|---|---|---|
| RotacaoDeLogs T1 (default de código) | ✓ | Lê `require config_path('logging.php')` com `LOG_STACK` desmontado do ambiente — um `default 'single'` volta a reprovar (`assertSame(['daily'])`); não depende do `.env` (o ponto fraco clássico) por construção. |
| RotacaoDeLogs T2 (poda real) | ✓ | `max_files` ausente → `fail()` (nunca skip, exigência do plano); driver `single` → nenhum `laravel-*.log` datado → `assertCount` reprova; sem poda → `20+` files vs `assertCount(retentação)` reprova. Provado indiretamente pelas sondas: é a mesma mecânica que podou 22→14 no runtime. |
| RotacaoDeLogs T3 (nível warning efetivo) | ✓ | `level: 'info'`/`debug` faria o `info` aparecer → `assertStringNotContainsString('registro de nivel insuficiente')` reprova. |
| Alerta T1/T2/T3 (POST web/API/503) | ✓ | Todas fazem `Http::assertSent` com campos específicos — **MUT-1 confirmou**: removida a chamada `notificar()` do hook `respond()`, **10 de 13 testes reprovar** (todos os que exigem POST). T3 exige `classe === HttpException` e status 503 — uma regressão para `report()` (que ignora `HttpException` via `internalDontReport`) mata este teste. |
| Alerta T4 (404) / T5 (422) | ✓ | `Http::assertNothingSent()` — um hook que alertasse para `< 500` reprova. |
| Alerta T6 (fallback sem URL) | ✓ | Se o fallback sumir (silêncio), `File::get` lança `FileNotFoundException` (provado pela MUT-1: este teste ficou entre os 10 FAILED). |
| Alerta T7/T8 (entrega falha) | ✓ | Exigem resposta 500 preservada + texto do motivo no canal + (`T7`) host mascarado e **URL completa ausente**. |
| Alerta T9 (dedup + expiração + breadcrumb) | ✓ | **MUT-2 confirmou:** `Cache::add` → `Cache::put` (a chave nunca se fecha) reprova com 3 POSTs; a janela expira no teste (`travel(11)` vs TTL array-store); o breadcrumb exige o alvo determinístico forçado com `level:'warning'` — breadcrumbs em `debug` (o que `LOG_LEVEL=warning` comeria) reprovariam. |
| Alerta T10 (distintos) / T11 (teto) | ✓ | Contagens de POST (`assertSentCount`) + o excedente no canal com o motivo do teto. |
| Alerta T12 (token) | ✓ | `assertStringNotContainsString('TOKEN-SECRETO')` + query + host presente. |
| **Alerta T13 (timeouts)** | ⚠️ NÃO reprovaria um caso quebrado relevante — lacuna A-1 | `assertNotSame($opcoes['timeout'], (int) config('escola.alertas.webhook_timeout'))` compara o valor CAPTURADO (7) contra o NOVO config (9): nunca remonta o `PendingRequest`. **Mutação ao vivo:** `tempoTotal()` hardcoded `return 7;` → o Teste 13 continua **PASSED** (1 passed, 4 assertions). Ou seja, o teste não prova "mudar o config muda os valores" como o plano anuncia. **Contestação do impacto:** a *feature* não é decorativa — provada por mim executando config→operação real (sonda E: `ALERT_WEBHOOK_TIMEOUT=2` cortou conexão de 9 s em 2,19 s, a `ConnectionException` virou registro de log). É uma lacuna de falsificação do TESTE, não do código; sugestão de correção (não-bloqueante): capturar um segundo `PendingRequest` após trocar o config e exigir `options['timeout']==9`. |

Mutações rodadas por mim (com restauração confirmada nos três casos por `git diff --quiet` = byte-exata vs HEAD, além de verde na suíte ou no slice):

1. **MUT-1** — remover a chamada `app(NotificadorDeErros::class)->notificar(...)` em `bootstrap/app.php`: **10 failed**, 3 passed (os três que não exigem POST). Restaurado → `13 passed (54 assertions)`.
2. **MUT-2** — `Cache::add` → `Cache::put` em `dentroDoLimiteDeDuplicidade()`: o Teste 9 de dedup **FAILED** (a supressão sumiu); "erros distintos" continuou passando como deve. Restaurado → `13 passed`.
3. **MUT-EXTRA** — `tempoTotal()` hardcoded em 7: Teste 13 **PASSOU DO MESMO JEITO** (lacuna A-1, item acima). Restaurado e confirmado.

### Required Artifacts

| Artefato | Esperado | Status | Detalhes |
|---|---|---|---|
| `laravel/config/logging.php` | stack→daily com comento pt-BR, `max_files` à prova de `0`, canal `alertas` | ✓ EXISTS + SUBSTANTIVE | linhas 57-95: coments pt-BR nos três pontos do plano (default seguro, `?:` como em `BACKUP_RETENTION_DAYS`, nível fixo anti-engolido). |
| `laravel/.env.example` / `.env.production.example` | `LOG_STACK=daily`, `LOG_DAILY_DAYS=14`, bloco `ALERT_*` coerente | ✓ EXISTS + SUBSTANTIVE | Dev: `LOG_STACK=daily`, `LOG_DAILY_DAYS=14`, 5 vars `ALERT_*` com comentários pt-BR (URL=segredo, vazia=fallback). Produção: mesmos valores + `LOG_LEVEL=warning` preservado + exemplo de leitura com `ls -1t` (nunca `date +%F`). Coerência config↔env conferida chave a chave: `ALERT_WEBHOOK_URL/TIMEOUT/CONNECT_TIMEOUT/DEDUP_MINUTES/MAX_PER_HOUR` = `webhook_url/webhook_timeout/webhook_connect_timeout/dedup_minutos/max_por_hora` (config/escola.php). |
| `laravel/app/Services/Observabilidade/NotificadorDeErros.php` | serviço completo (294 linhas) | ✓ EXISTS + SUBSTANTIVE | Assinatura = `hash('sha256', status|classe|path)` (mensa­gem FORA, como o plano pedia); dedup com `Cache::add(..., minutos*60)` + fail-open; teto com `RateLimiter` `observabilidade:alertas`/3600s; `registarSupressao()` `warning` no canal PADRÃO; payload de 11 chaves pt-BR sem headers/corpo/stack, mensagem truncada a 500; `enviar()` try/catch em dois níveis (ConnectionException específica), nunca `throw`; `hostMascarado()` = só esquema+host+porta; `notificar()` inteiro engolido por `catch (Throwable)`; `requisicao()` com os dois timeouts. |
| `laravel/bootstrap/app.php` | hook `$exceptions->respond()` | ✓ EXISTS + SUBSTANTIVE | Callback com comentário pt-BR explicando `respond()` vs `report()` (HttpException/`internalDontReport`); dispara só `>= 500`; devolve `$response` RECEBIDA intacta (`use` corretos: SymfonyResponse, NotificadorDeErros, Throwable). |
| `laravel/config/escola.php` | bloco `alertas` | ✓ EXISTS + SUBSTANTIVE | 6 chaves lidas de `ALERT_*`, todas com `?:` exceto `webhook_url` (estado legítimo "sem canal" sem default) e `canal_log`/'alertas' — exatamente como o plano pediu. |
| `laravel/tests/Feature/RotacaoDeLogsTest.php` | 3 testes | ✓ EXISTS + SUBSTANTIVE | PHPUnit classe (convenção da suíte), cada teste com diretório próprio + `beforeApplicationDestroyed`; T2 usa `config(...daily.path)` + `Log::forgetChannel`; T3 prova nível efetivo; T1 prova default de CÓDIGO sem depender do `.env`. |
| `laravel/tests/Feature/AlertaErroServidorTest.php` | 13 testes | ✓ EXISTS + SUBSTANTIVE | 13 comportamentos do plano; canal redirecionado para arquivo temp via `apontarAlertas()` com `forgetChannel`; T9 força o canal padrão para um alvo determinístico com level `warning` (espelho de produção); `Cache` array preservado do `phpunit.xml` (sem `.env.testing`, confirmado). |
| `laravel/DEPLOY.md` | `## Observabilidade` com `### Logs da aplicação` + `### Alertas de erro 5xx` | ✓ EXISTS + SUBSTANTIVE + EXECUTÁVEL | §Logs: volume `app-storage` compartilhado por `app`/`queue`/`scheduler`, logs fora do host e fora do backup da fase 1, `LOG_DAILY_DAYS=0` não desliga, LOG_LEVEL recomendado, comandos de ler/conferir/limpar. §Alertas: o que dispara/não dispara, troca de canal sem código, payload, dedup/teto com breadcrumb `warning`, timeouts, fallback, dados sensíveis. **Comandos executados por mim como escritos:** leitura do log (`ls -1t … | tail -n 200` funcionou — o arquivo mais recente, com o fuso do APP nomeando), `du -sh` (264K), `config:show escola` (bloco `alertas` listado). **Zero `date +%F`/`date +%Y`** no arquivo. |
| — | nada da infra de backup alterada | ✓ CONFIRMED | `git diff 333405b..HEAD --stat` não contém NENHUM arquivo de `app/Services/Backup*`, `app/Console/Commands`, `app/Contracts`, `routes/`, `docker-compose.prod.yml` (escopo da fase): análise confinada a observabilidade/docs/tests. |

### Key Link Verification

| De | Para | Via | Status | Detalhes |
|---|---|---|---|---|
| `bootstrap/app.php` | `respond()` → `notificar()` → resposta intacta | callback de `withExceptions` | ✓ WIRED | Lido e provado por mutação (MUT-1: 10 testes morrem sem a chamada) e pelo E2E (status final 500/503/404/422 inteiro intacto). |
| `NotificadorDeErros` | `config('escola.alertas.*')` | leitura na hora da chamada | ✓ WIRED | Troca por inline env alterou TODOS os valores no runtime (item 8). |
| `NotificadorDeErros::enviar()` | `Log::channel('alertas')` | `canal_log` do config | ✓ WIRED | Sonda D: fallback no arquivo real `alertas-2026-10-17.log`. |
| `dentroDoLimiteDeDuplicidade()` | `Cache::add('alerta:erro:'.assinatura, minutos*60)` | dedup por TTL | ✓ WIRED | Prova por MUT-2 (teste de dedup morre se a marcação não existir) + Sonda B (2 supressões no mundo real). |
| `dentroDoLimiteGlobal()` | `RateLimiter::tooManyAttempts/hit('observabilidade:alertas', 3600)` | teto global | ✓ WIRED | Sonda C: excedente registrado com o motivo; `config:show` mostra `max_por_hora` configurável. |
| `alertas` de log | retenção `LOG_DAILY_DAYS` | `max_files` compartilhado | ✓ WIRED | Duplica a expressão do canal `daily` (logging.php:93) — a sondagem da truth 4 vale para ambos. |

## Requirements Coverage

| Requisito | Status | Bloqueio |
|---|---|---|
| OBS-01 (logs rotacionam com retenção; disco limitado) | ✓ SATISFIED | Nenhum. Poda real 22→14 / 20→3 / 0+empty→14, env e default de código, canal `alertas` com nível fixo, doc operacional. |
| OBS-02 (5xx avisa pelo canal configurável; fallback em log; requisição nunca derrubada) | ✓ SATISFIED | Nenhum. POST real por status final (incl. `abort(503)`), fallback verificado, falha de entrega e timeout reais sem derrubar 500, dedup/teto/mascaramento provados no runtime local com receptores de verdade. |

**Coverage:** 2/2 requisitos satisfeitos

## Anti-Patterns Found

| Arquivo | Trecho | Padrão | Severidade | Impacto |
|---|---|---|---|---|
| `tests/Feature/AlertaErroServidorTest.php` (Teste 13) | `assertNotSame($opcoes['timeout'], (int) config('escola.alertas.webhook_timeout'))` | Asserção compara valor capturado vs valor de config, sem remontar o `PendingRequest` | ⚠️ aviso (A-1) | Um `tempoTotal()` hardcoded passa no teste (mutação minha provou). A feature em si é real (sonda E com corte em 2,19 s). Correção desejável: capturar um segundo objeto após trocar o config e exigir `options['timeout'] === 9`. |
| `DEPLOY.md` (§ "Como testar manualmente") | mostra `config:show escola` e `tail` do canal, mas não traz o roteiro do receptor (script + reinício do container) | Doc parcial face ao plano desta tarefa (item 3 do plano 02-02 dizia "o mesmo roteiro do verify") | ℹ️ info (I-1) | O operador que nunca viu esta verificação não tem o script pronto; os demais pontos do runbook estão presentes e coerentes com o código conferido linha a linha. |
| `storage/logs/alertas-*.log` dev | 3 entradas `testing.WARNING` de "sonda de timeout" (11:29:10/17/26) | Resíduo de execuções anteriores à minha passagem (espelha o padrão de mutação em que a URL vira vazia; **não se reproduz** no código commitado — rerodei a classe e a suíte completa: **zero** entradas novas) | ℹ️ info (I-2) | Apenas evidência histórica em log de dev; nenhum teste escreve no arquivo real com o código pendente. |
| Nenhum no restante | — | Segredos/stack leak/erro engolido em silêncio/CJK | ✓ | Zero CJK em `app/config/tests/bootstrap/DEPLOY.md/.env.example/.env.production.example`; nenhum `TODO/FIXME/stub`; `catch` de supressão de breadcrumb é o único silêncio aceitável (é log, não alerta); nenhum `date +%F` na doc. |

## Human Verification Required

### 1. Disparo contra o webhook REAL da escola (n8n/Slack) em produção
**Test:** Configurar `ALERT_WEBHOOK_URL` no `.env.production` com o webhook de verdade, recriar o container, provocar (ou esperar) um 5xx e conferir o payload RECEBIDO do lado do n8n/Slack.
**Expected:** POST JSON com as 11 chaves (`aplicacao…ocorrido_em`); o fluxo do n8n precisa processar o payload.
**Why human:** a entrega com receptor local já está provada; o fluxo/consumidor externo e as regras do serviço (rate limits, autenticação do canal) são do operador — não observáveis daqui.

### 2. Comportamento do teto sob enxurrada REAL de erros simultâneos
**Test:** Em produção com erro real recorrente (ex.: banco fora), observar `ALERT_MAX_PER_HOUR` limitando o webhook e o excedente caindo no `alertas-*.log` durante a janela de 1 hora.
**Expected:** no máximo `ALERT_MAX_PER_HOUR` POSTs distintos; duplicados por `ALERT_DEDUP_MINUTES`; nenhuma cascata de erro.
**Why human:** exige produção real com sqlite/dicionário de cache compartilhado e concorrência genuína (`queue`, php-fpm workers) — o `CACHE_STORE=array` dos probes isola por processo de propósito e não reproduz essa condição.

### 3. Leitura dos logs pelo host de produção (volume `app-storage`)
**Test:** No host: `$P exec -u www-data app sh -c 'ls -1 storage/logs'` após um dia de operação; conferir contagem ≈ `LOG_DAILY_DAYS` e rotação de fato sob os 3 serviços.
**Why human:** os logs ficam dentro do volume nomeado (não aparecem no host daqui); demanda a stack de produção rodando.

### 4. Falha do cache em produção (dedup/teto fail-open)
**Test:** Com `CACHE_STORE=database` em produção, simular a indisponibilidade do store (ex.: tabela ausente) e conferir que o alerta é enviado para webhook (fail-open) e que a tentativa é registrada no canal `alertas`.
**Why human:** o fail-open tem teste unitário coberto apenas pela leitura do código (o plano não o exigiu em teste dedicado); na produção real o caminho envolve o store ativo do site.

## Gaps Summary

**No gaps found** nos must-haves: 13/13 verificados com execução própria independente (pipeline HTTP completo + receptores reais + mutações com restauração confirmada), 2/2 requisitos satisfeitos, regressão da fase 1 intacta (**76 passed + 1 skipped**, pint **94 files PASS**, zero arquivos de backup tocados em `333405b..HEAD`). Um aviso não-bloqueante (A-1: força de falsificação do Teste 13) e três infos (I-1 doc parcial do roteiro de teste manual; I-2 resíduo histórico em log de dev; I-3 — os verifies que plantam arquivos em `storage/logs` são destrutivos em dev: eu mesmo apaguei os `laravel-2*.log`/`alertas-2*.log` de hoje durante as sondas de poda, como o plano já adverte; **nunca reproduzir em produção**).

## Verification Metadata

**Abordagem:** goal-backward, adversarial: cada verify meu é um roteiro DIFERENTE do do plano (ex.: E2E por `Kernel::handle` com rotas registradas em runtime, não `handler->render`; receptores com modo anexo para contagem exata de POSTs; mutações em `bootstrap/app.php`, `Cache::add→put` e `tempoTotal()`), restauração confirmada por `git diff --quiet` + suíte verde.
**Fonte dos must-haves:** frontmatter dos PLAN.md (6 truths em 02-01 + 7 em 02-02 = 13).
**Checagens automatizadas:** 27 executadas por mim, 27 com resultado citado acima; 3 mutações (2 confirmaram guardas, 1 expôs lacuna de teste).
**Caveat de método:** (i) uma primeira sonda minha de rotação com datas geradas por `seq -w` criou nomes `laravel-2024-101-01.log` inválidos (não casam com o padrão do RotatingFileHandler) e NÃO provou poda — descartada e refeita com datas válidas, cujo resultado está citado; (ii) o travamento das sondas E2E é o `.env` de dev (guardado de leitura: apenas contagens de chave, jamais impresso).
**Checagens humanas necessárias:** 4
**Tempo total de verificação:** ~45 min

## Veredito Final

**PASSED** — objetivo e os 2 requisitos das fases 02-01/02-02 atingidos com evidência executada e independente; nenhum must-have refutado; nenhum bloqueador.

**Itens a corrigir (nenhum bloqueia):**
- ⚠️ **A-1** (aviso): Teste 13 não falsifica timeout hardcoded (mutação ao vivo reproduz o gap) — fortalecer o teste ou aceitar a prova E2E atual como suficiente; correção de 5 linhas.
- ℹ️ **I-1** (info): `DEPLOY.md` "Como testar manualmente" pode incluir o roteiro do receptor (script `php -S` + reinício de container), como o plano tarefa 03 sugeriu.
- ℹ️ **I-2** (info): resíduos `testing` em log de dev de 11:29 — não reprodutíveis no código atual (suítes rerodadas verdes); nada a fazer.
- ℹ️ **I-3** (info): verifies de rotação são destrutivos em dev (apagam log do dia); já documentado no plano — restringir a dev.

**Pendências de VERIFICAÇÃO HUMANA:** 4 (webhook real em produção; teto sob erro simultâneo real; leitura dos logs pelo host de produção; fail-open do cache com `CACHE_STORE=database`).

---
*Verificado: 2026-10-17T12:05:00Z*
*Verificador: subagente independente — tentativa de refutação executada com sondas, mutações e greps próprios; nada foi commitado; mutações restauradas com confirmação; artefatos temporários removidos.*

## Fixes Pós-Verificação (fechamento, pelo orquestrador)

- **A-1 RESOLVIDO**: Teste 13 fortalecido — uma SEGUNDA notificação (assinatura 502 + rota remarcada) força a remontagem do `PendingRequest` e exige `options['timeout'] === 9` re-lido do config (com o `connect_timeout` conferido de novo). Reconfirmado por MUTAÇÃO com `tempoTotal()` fixo em `5`: o teste REPROVA; restaurado: 13 passed (55 assertions na classe). Suíte completa rerodada: **76 passed + 1 skipped (337 assertions)**, pint **94 files PASS**.
- **I-1 RESOLVIDO**: `DEPLOY.md` ganhou o roteiro do receptor local (`php -S` + gravação do payload + conferência do JSON recebido) na subseção "Como testar manualmente".
- **I-2 / I-3**: sem ação (histórico de dev e comportamento já documentado como destrutivo-e-dev).
- Os dois fixes foram reconfirmados por mutação executada, com restauração verificada — o padrão adotado na fase 1.
