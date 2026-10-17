---
phase: 02-observabilidade-operacional
plan: 02
subsystem: observabilidade
tags: [alertas, webhook, 5xx, excecoes, deduplicacao, segredos, testes, deploy]

# Dependency graph
requires:
  - phase: 02-observabilidade-operacional
    plan: 01
    provides: "Canal de log dedicado `alertas` (fallback do alerta) e rotação diária com retenção"
provides:
  - "Alerta de erro 5xx por webhook configurável (`ALERT_WEBHOOK_URL`) — captura pelo STATUS FINAL via `$exceptions->respond()` em bootstrap/app.php; abort(503) também alerta"
  - "`NotificadorDeErros` à prova de falha (nenhuma exceção escapa ao ciclo da requisição; falha de entrega não derruba o usuário)"
  - "Deduplicação por assinatura (status+classe+rota, `ALERT_DEDUP_MINUTES`) com breadcrumb `warning` no canal padrão e teto global `ALERT_MAX_PER_HOUR` — excedente vai para log, nunca silêncio"
  - "Fallback sem URL/falha de entrega no canal `alertas`, com host mascarado (URL com token nunca logada)"
  - "`AlertaErroServidorTest` com 13 comportamentos sem MySQL nem rede real"
affects: [operação da escola, fase 4 (alinhamento Pest)]

actuals:
  tokens: 22000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Captura de erro por STATUS FINAL (`respond()`) em vez de `report()` — cobre HttpException (abort) e web+API num hook só, mantendo a resposta intacta"
    - "Serviço de notificação fail-safe: corpo inteiro em try/catch, registro de falha que engole a própria falha, fail-open no cache (avisar demais > perder alerta)"
    - "Segredo nunca em log: apenas esquema+host+porta passam pela máscara de host"
    - "RateLimiter com janela fixa de 3600 s para o teto global e Cache::add para o dedup (store array no teste)"

key-files:
  created:
    - laravel/app/Services/Observabilidade/NotificadorDeErros.php
    - laravel/tests/Feature/AlertaErroServidorTest.php
  modified:
    - laravel/bootstrap/app.php
    - laravel/config/escola.php
    - laravel/.env.example
    - laravel/.env.production.example
    - laravel/DEPLOY.md

key-decisions:
  - "`respond()` em vez de `report()`: o hook report() ignora HttpException por padrão (internalDontReport), então abort(503) não alertaria; o status final cobre web+API e exclusões (404/422) de graça"
  - "Bloco `alertas` em config/escola.php (config do NEGÓCIO, não da infraestrutura): todos os números com `?:` à prova de valor vazio, igual BACKUP_RETENTION_DAYS"
  - "Envio SÍNCRONO com timeouts curtos (5 s total / 2 s conexão): simplicidade sobre filas — o teto+dedup limitam o impacto, e falha vira log"
  - "Payload mínimo sem headers/query/stack: avisa sem vazar dados de alunos"
  - "Breadcrumb de supressão em `warning` no canal PADRÃO (nunca no `alertas`) — sobrevive a LOG_LEVEL=warning de produção e não dispara webhook"

patterns-established:
  - "Teste de alvo determinístico do canal padrão: stack→single→quivo temporário em level warning com forgetChannel nos DOIS canais"
  - "Cache array persiste no processo da suíte: assinatura inclui a rota e caminhos de sonda são únicos por iteração/teste para dedips não colidirem"

requirements-completed: [OBS-02]

coverage:
  - id: D1
    description: "5xx dispara UM POST com status, classe, mensagem, rota e método; abort(503) também alerta; 404/422 não disparam"
    requirement: OBS-02
    verification:
      - kind: e2e
        ref: "ALERTA E2E OK: POST real ao receptor local com status=500, mensagem e rota; 404 NAO E 5xx OK"
        status: pass
      - kind: unit
        ref: "tests/Feature/AlertaErroServidorTest.php#test_erro_5xx_em_rota_web_dispara_o_post_no_webhook / ...api... / ...abort_503... / ...404... / ...422..."
        status: pass
    human_judgment: false
  - id: D2
    description: "Trocar o canal é só varar ALERT_WEBHOOK_URL no .env, sem edição de código"
    requirement: OBS-02
    verification:
      - kind: integration
        ref: "CANAL POR ENV OK: config:show escola reflete env trocada; SEM URL FIXA EM CODIGO OK (grep); limites ALERT_DEDUP_MINUTES=3 ALERT_MAX_PER_HOUR=7 refletem por env"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sem URL ou webhook fora do ar: alerta fica no canal `alertas` e a requisição do usuário segue normal"
    requirement: OBS-02
    verification:
      - kind: e2e
        ref: "FALLBACK OK: status=500 mantido e alerta em storage/logs/alertas-2026-10-17.log"
        status: pass
      - kind: unit
        ref: "...sem_webhook_configurado... / ...falha_http... / ...falha_de_conexao_nao_derruba_a_requisicao"
        status: pass
    human_judgment: false
  - id: D4
    description: "Deduplicação por assinatura expira (10 min) e deixa breadcrumb warning no canal padrão; teto global manda excedente para o log"
    requirement: OBS-02
    verification:
      - kind: mutation
        ref: "remover registrarSupressao() => Teste 9 FALHOU; warning→debug => Teste 9 FALHOU; restaurado => 13 passed"
        status: pass
    human_judgment: false
  - id: D5
    description: "URL completa (com token) nunca vai para log: apenas esquema/host/porta"
    requirement: OBS-02
    verification:
      - kind: mutation
        ref: "hostMascarado vazando URL => 2 testes de segredo FALHARAM; restaurado => passed"
        status: pass
  - id: D6
    description: "Timeouts explicitos de conexão e total, lidos do config"
    requirement: OBS-02
    verification:
      - kind: unit
        ref: "...timeouts_explicitos_do_config (PendingRequest->options com timeout=7/connect_timeout=3 do config)"
        status: pass
      - kind: mutation
        ref: "envio no-op => Teste 1 FALHOU em assertSent (verify não-tautológico), provado"
        status: pass

duration: 45min
completed: 2026-10-17
status: complete
---

# Fase 2: Observabilidade Operacional — Plano 02 Summary

**Todo erro 5xx da escola agora vira um alerta entregável em um webhook configurável por `.env` — com fallback garantido em log, deduplicação com breadcrumb e teto contra enxurrada — e nada disso é capaz de quebrar a resposta do aluno/professora.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-10-17
- **Tasks:** 3 de 3
- **Files modified:** 7 (2 criados, 5 alterados)

## Accomplishments

- **Captura pelo STATUS FINAL** (`$exceptions->respond()` em bootstrap/app.php): `abort(503)` — que o `report()` ignoraria — também alerta; 404/401/403/419/422 não disparam; web e API num hook só, com a resposta do usuário devolvida intacta.
- **`NotificadorDeErros`** à prova de falha: corpo inteiro em try/catch, falha do próprio notificador registrada (e engolida), fail-open no cache de dedup.
- **POST JSON** com status, classe, mensagem (truncada), arquivo/linha, método, rota e `ocorrido_em` — SEM headers, query string nem stack trace.
- **Timeouts explícitos** de conexão (2 s) e total (5 s), lidos do config, provados pelo teste pelas opções do PendingRequest.
- **Deduplicação** (status+classe+rota, 10 min — assinatura hash em SHA-256 via `Cache::add`) **com breadcrumb `warning` no canal padrão**, provado sobreviver ao LOG_LEVEL=warning de produção; **teto global** de 30/h (`RateLimiter`) com o excedente indo para o canal `alertas`.
- **Fallback**: sem URL (estado legítimo) ou em falha de entrega, o alerta fica em `storage/logs/alertas-*.log` com apenas host/porta em log — a URL completa (que pode conter o token do webhook) jamais aparece.
- **Trocar o canal é variar o `.env`**: provado com `config:show escola` refletindo `ALERT_WEBHOOK_URL` e limites trocados na linha de comando; nenhum webhook em código.
- **DEPLOY.md**: subseção "Alertas de erro 5xx" com o que dispara/não dispara, como trocar o canal, payload, fallback, dedup/teto, timeouts, cuidado com o segredo e roteiro de teste manual.

## Task Commits

1. **Tarefas 1–3 (hook + serviço + config + testes + envs + docs)** — `fd5cfd3` (feat)

**Plan metadata:** `(este commit)` (docs: SUMMARY do plano 02-02)

## Files Created/Modified

- `laravel/app/Services/Observabilidade/NotificadorDeErros.php` — serviço de alerta (novo)
- `laravel/bootstrap/app.php` — hook `respond()` de status final (novo `use` dos imports)
- `laravel/config/escola.php` — bloco `alertas` (url, timeouts, dedup, teto, canal)
- `laravel/tests/Feature/AlertaErroServidorTest.php` — 13 comportamentos (novo)
- `laravel/.env.example` / `.env.production.example` — bloco `ALERT_*` com comentários pt-BR
- `laravel/DEPLOY.md` — subsecção de alertas em `## Observabilidade`

## Decisions Made

- **Teste 6 com rotas distintas por iteração** (`sem-url-0`/`sem-url-1`): a dedup é assinatura no cache do processo da suíte, e o MESMO caminho seria suprimido na 2ª iteração por motivo errado — correção de teste, não de código.
- **Teste 13 configura o webhook explicitamente**: sem URL o `requisicao()` nem monta o PendingRequest, e o teste originalmente assertiva null — cuidado com o estado legítimo "sem URL".
- **Token mascarado em log a nível de esquema+host+porta** (não a URL "com token cortado"): query string carrega segredo.
- **Bloco `ALERT_*` nas `.example` com URL vazia por padrão**: "sem webhook" é um estado legítimo e documentado, com fallback garantido.

## Deviations from Plan

- Nenhuma funcional: todos os verifies previstos rodaram e passaram (3 da tarefa 1, 13 testes + suite + pint da tarefa 2, 3 da tarefa 3) — incluindo as duas mutações exigidas (Teste 9 reprova sem `registrarSupressao()`; Teste 1 reprova com no-op) e duas pequenas extras (debug-level e host sem máscara).
- **Nota registrada novamente:** a suíte é PHPUnit em classes; menção a Pest no `laravel/CLAUDE.md` segue divergente (alinhamento na fase 4).

## Issues Encountered

- `php artisan config:show --json` não existe nesta versão do Laravel — verify executado no formato tabela (mesma prova).

## User Setup Required

- **Produção**: preencher `ALERT_WEBHOOK_URL=` no `.env.production` (n8n/Slack/Discord) e recriar o container (`$P up -d`). Enquanto vazio, o alerta fica no log `storage/logs/alertas-*.log`.
- **Dev**: `.env` já atualizado com o bloco `ALERT_*` (URL vazia = fallback em log).

## Next Phase Readiness

- OBS-02 concluída. A fase 2 está completa (2/2 planos): faltam apenas a verificação independente e o bookkeeping final.

---
*Fase: 02-observabilidade-operacional*
*Completed: 2026-10-17*
