---
phase: 02-observabilidade-operacional
plan: 01
subsystem: infra
tags: [logs, rotacao, retencao, monolog, alertas, deploy, testes]

# Dependency graph
requires:
  - phase: 02-observabilidade-operacional
    plan: 00
    provides: "Nada — primeira onda da fase (depende apenas do estado concluído da fase 1)"
provides:
  - "Canal `stack` (destino padrão do log) resolvendo para o canal `daily` — por env (`LOG_STACK=daily` nas duas `.example`) e por default de CÓDIGO, provado por teste independente do `.env`"
  - "Retenção real da rotação diária (`max_files` amarrado a `LOG_DAILY_DAYS`) com poda provada por comportamento e à prova de `0`"
  - "Canal dedicado `alertas` (daily, nível FIXO `warning`, mesma retenção) — base do fallback do alerta 5xx do plano 02-02"
  - "`RotacaoDeLogsTest` com 3 comportamentos (default de código, poda real, nível efetivo)"
  - "Seção `## Observabilidade` no DEPLOY.md (onde ficam, rotação/retenção, LOG_LEVEL, leitura, disco, limpeza, dados sensíveis)"
affects: [plano 02-02 (fallback do alerta), operação da escola]

actuals:
  tokens: 8000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Teste de default de config lido via `require config_path(...)` com o env removido do processo (unset/putenv em finally) — o `.env` não versionado não mascara o teste"
    - "Prova de poda por comportamento: plantar retenção + 10 arquivos datados antigos, escrever UMA vez, contar sobreviventes (o RotatingFileHandler poda na primeira escrita quando o arquivo do dia não existe)"
    - "`(int) (env(...) ?: 14)` como padrão de env numérico à prova de zero, igual a BACKUP_RETENTION_DAYS"

key-files:
  created:
    - laravel/tests/Feature/RotacaoDeLogsTest.php
  modified:
    - laravel/config/logging.php
    - laravel/.env.example
    - laravel/.env.production.example
    - laravel/DEPLOY.md

key-decisions:
  - "Default de código do `stack` mudou de `single` para `daily`: um template de produção antigo sem LOG_STACK gravaria um laravel.log único e sem limite — o comportamento seguro vira o padrão"
  - "`LOG_DAILY_DAYS=0` cai no padrão 14 porque `max_files=0` no RotatingFileHandler significa 'sem limite' e desligaria a poda silenciosamente"
  - "O canal `alertas` tem nível FIXO em `warning` (não lê LOG_LEVEL): um ambiente com LOG_LEVEL=error engoliria o alerta em silêncio"
  - "Serviços de produção (`app`/`queue`/`scheduler`) compartilham o MESMO `storage/logs` via volume `app-storage` — comportamento idêntico aos verifies de dev"
  - "Os comandos de documentação não montam data pelo shell (UTC × America/Sao_Paulo): leem o arquivo datado mais recente"

patterns-established:
  - "Verify de capacidade de infra com fixture destrutiva e aviso explícito (apagar logs datados de dev é aceitável em dev, nunca em produção)"

requirements-completed: [OBS-01]

coverage:
  - id: D1
    description: "O log gravado vira `laravel-AAAA-MM-DD.log` (rotação diária), por env e por default de código"
    requirement: OBS-01
    verification:
      - kind: integration
        ref: "verify ROTACAO OK: 20 arquivos plantados + 1 escrita => 14 arquivos, laravel-2026-10-17.log criado (data do APP), laravel-2020-01-01.log podado"
        status: pass
      - kind: unit
        ref: "tests/Feature/RotacaoDeLogsTest.php#test_default_de_codigo_do_stack_e_o_canal_daily (unset/putenv + require config_path)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A poda é real, não leitura de config: 20 antigos + 1 escrita => exatamente 14, o do dia presente e o mais antigo removido"
    requirement: OBS-01
    verification:
      - kind: integration
        ref: "ROTACAO OK: n=14; laravel-2020-01-08.log preservado (14 mais novos por nome)"
        status: pass
      - kind: mutation
        ref: "max_files mutado para 0 => Teste 2 FALHOU (RotacaoDeLogsTest.php:76, fail 'retenção configurada'); restaurado => 3 passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "A retenção é configurável por ambiente: LOG_DAILY_DAYS=3 => 3 arquivos; LOG_DAILY_DAYS=0 => 14 (não desliga a poda)"
    requirement: OBS-01
    verification:
      - kind: integration
        ref: "RETENCAO CONFIGURAVEL OK: 3 arquivos com LOG_DAILY_DAYS=3; RETENCAO ZERO NAO DESLIGA A PODA OK: 14 arquivos"
        status: pass
    human_judgment: false
  - id: D4
    description: "Cobertura automatizada que REPROVA (não pula) se a retenção sumir"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "tests/Feature/RotacaoDeLogsTest.php#test_a_retensao_poda_os_arquivos_antigos_de_verdade (fail quando max_files < 1)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Canal dedicado `alertas` com nível efetivamente aplicado (warning grava, info é filtrado)"
    requirement: OBS-01
    verification:
      - kind: unit
        ref: "tests/Feature/RotacaoDeLogsTest.php#test_o_canal_de_alertas_aplica_o_nivel_warning (assertStringContainsString em alertas-*.log)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Wiring completo: LOG_STACK=daily nas duas .example, default de código, max_files à prova de zero e canal `alertas`"
    requirement: OBS-01
    verification:
      - kind: integration
        ref: "WIRING DE LOGS OK (grep das 7 marcas) + ENV DE DEV OK: runtime resolve 'daily' com o .env atualizado (não versionado)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Runbook de logs em DEPLOY.md (volume app-storage, retenção, LOG_LEVEL, leitura, disco, limpeza, dados sensíveis)"
    requirement: OBS-01
    verification:
      - kind: manual_procedural
        ref: "DOCS DE LOGS OK (## Observabilidade, ### Logs da aplicação, LOG_DAILY_DAYS, app-storage, alertas-, du -sh storage/logs); comandos na forma completa $P/--env-file (checador W2)"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-10-17
status: complete
---

# Phase 2: Observabilidade Operacional — Plano 01 Summary

**O log da aplicação rotaciona por dia com retenção real comprovada: 20 arquivos antigos plantados + uma única escrita deixam exatamente 14 no disco, e o `laravel.log` único e sem limite de hoje deixou de existir — por env e por default de código.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-10-17
- **Tasks:** 3 de 3
- **Files modified:** 5 (1 criado, 4 alterados)

## Accomplishments

- O destino padrão do log passou de um `laravel.log` único e sem limite para rotação diária (`laravel-AAAA-MM-DD.log`), com retenção de `LOG_DAILY_DAYS` (**14**) dias, removendo os arquivos além dela automaticamente.
- A poda é **real**, provada por comportamento: plantar retenção + 10 arquivos datados e escrever uma vez deixa exatamente `retencao` arquivos, com o do dia presente e o mais antigo removido.
- A retenção é **configurável por ambiente** (`LOG_DAILY_DAYS=3` => 3 arquivos) e **à prova de zero** (`LOG_DAILY_DAYS=0` cai no padrão 14, porque `max_files=0` no Monolog significa "sem limite" e desligaria a poda silenciosamente).
- Default de código trocado de `single` para `daily` com **prova independente do `.env`** (`require config_path` com o env removido do processo) — um template de produção antigo não volta a gravar log ilimitado.
- Canal dedicado `alertas` (daily, nível fixo `warning`, mesma retenção) para o fallback do alerta da onda 2; nível efetivo provado (o `info` é filtrado, o `warning` grava).
- `DEPLOY.md` ganhou a seção `## Observabilidade`: onde os logs ficam (volume `app-storage` compartilhado e por que NÃO vão para o host nem para o backup), rotação/retenção, `LOG_LEVEL` recomendado, comandos de leitura/conferência de disco/limpeza e o cuidado com dados sensíveis.

## Task Commits

1. **Tarefas 1–3 (config + testes + documentação)** — `450b9dc` (feat)

**Plan metadata:** `(este commit)` (docs: SUMMARY do plano 02-01)

## Files Created/Modified

- `laravel/config/logging.php` — `stack` → `daily` (default de código), `max_files` à prova de zero, canal `alertas`
- `laravel/.env.example` / `laravel/.env.production.example` — `LOG_STACK=daily`, `LOG_DAILY_DAYS=14` com comentários pt-BR
- `laravel/tests/Feature/RotacaoDeLogsTest.php` — 3 testes (default de código, poda real, nível do canal)
- `laravel/DEPLOY.md` — seção `## Observabilidade` / `### Logs da aplicação`

## Decisions Made

- **`(int) (env('LOG_DAILY_DAYS') ?: 14)`** — mesmo padrão do `BACKUP_RETENTION_DAYS`: o `0` (e o vazio) não podem desligar a poda.
- **Nível do canal `alertas` fixo em `warning`** — o alerta nunca pode ser engolido por um `LOG_LEVEL=error` global.
- **Testes sem `RefreshDatabase`** — nada de banco nos testes de log; cada teste monta seu diretório temporário em `storage/framework/testing/...` com limpeza em `beforeApplicationDestroyed`.
- **Comandos de documentação leem o arquivo datado mais recente** (`ls -1t ... | head -1`) em vez de montar a data pelo shell (fusos UTC × America/Sao_Paulo — o checador pegou esse desvio e a correção está nos comandos).

## Deviations from Plan

- Nenhuma funcional: os três verifies das tarefas passaram como estão no plano (5 verifies de tarefa 1 + testes + pint + docs).
- **Nota de convenção (registrada no plano e nos SUMMARYs da fase):** `laravel/CLAUDE.md` menciona Pest, mas a suíte real é PHPUnit em classes (não existe `tests/Pest.php`) — alinhamento do CLAUDE.md fica para uma tarefa de documentação fora da fase.

## Issues Encountered

- O verify da rotação apaga `laravel-2*.log` datados de dev (técnica obrigatória: a rotação só dispara com o arquivo do dia ausente) — comportamento marked como **destrutivo** no plano; nunca rodar em produção.

## User Setup Required

No `.env` de produção: `LOG_STACK=daily` e `LOG_DAILY_DAYS=14` (já no `.env.production.example`). Logs ficam no volume `app-storage` e NÃO entram no backup da fase 1.

## Next Phase Readiness

- OBS-01 entrega concluída e o canal `alertas` (base do fallback do alerta 5xx) existe — o plano 02-02 pode executar.

---
*Phase: 02-observabilidade-operacional*
*Completed: 2026-10-17*
