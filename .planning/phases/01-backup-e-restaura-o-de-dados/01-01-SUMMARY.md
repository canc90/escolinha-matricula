---
phase: 01-backup-e-restaura-o-de-dados
plan: 01
subsystem: infra
tags: [backup, mysqldump, gzip, tar, scheduler, docker, retencao]

# Dependency graph
requires:
  - phase: (nenhuma — primeira fase do milestone)
    provides: app Laravel + MySQL em Docker já operacionais
provides:
  - "Comando `escola:backup`: dump MySQL compactado + uploads + manifesto sha256 por execução"
  - "Retenção configurável (14 dias por padrão) com poda tolerante a falhas"
  - "Agendamento diário às 02:30 via schedule:work (produção) / scheduler"
  - "Destino de backup configurável e recuperável no host em produção (bind mount)"
  - "Interfaces `DatabaseDumper` e `FileArchiver` para testar backup/restauração sem binários reais"
affects: [01-02 (restauração), fase de backup off-site (BACKUP-04)]

actuals:
  tokens: 6400
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Marcador de conclusão: `manifest.json` é gravado por último e sua presença define um backup íntegro"
    - "Dependências externas atrás de contratos (`DatabaseDumper`, `FileArchiver`) com binding no AppServiceProvider"
    - "Segredos de CLI via arquivo temporário `--defaults-extra-file` 0600 em vez de argumento"
    - "Fixação de data por `checkdate()` antes de qualquer poda destrutiva"

key-files:
  created:
    - laravel/config/escola.php
    - laravel/app/Contracts/DatabaseDumper.php
    - laravel/app/Contracts/FileArchiver.php
    - laravel/app/Services/Backup/MysqldumpDumper.php
    - laravel/app/Services/Backup/TarArchiver.php
    - laravel/app/Console/Commands/Backup.php
  modified:
    - laravel/app/Providers/AppServiceProvider.php
    - laravel/routes/console.php
    - laravel/.env.example
    - laravel/.env.production.example
    - laravel/docker-compose.yml
    - laravel/docker-compose.prod.yml
    - laravel/.gitignore

key-decisions:
  - "Destino = `BACKUP_PATH` ?: storage_path('app/backups'); em produção o compose monta `${BACKUP_HOST_PATH:-./backups}` nesse caminho nos serviços app e scheduler, senão o backup ficaria preso no volume app-storage"
  - "Retenção padrão de 14 dias, sobrescrevível por --retention-days e por BACKUP_RETENTION_DAYS"
  - "Agendamento diário às 02:30 com withoutOverlapping(30) para não concorrer com o job de alertas da meia-noite"
  - "A retenção roda fora do try/catch do backup e cada diretório é podado em try/catch próprio: uma falha de permissão nunca apaga o backup do dia"
  - "O catch do comando só remove o diretório corrente quando ele NÃO tem manifest.json"

patterns-established:
  - "Backup atômico por diretório datado: backup-AAAA-MM-DD_HHMMSS com database.sql.gz, uploads.tar.gz e manifest.json"

requirements-completed: [BACKUP-01, BACKUP-02]

coverage:
  - id: D1
    description: "`escola:backup` gera dump completo do MySQL compactado em gzip dentro de um diretório datado"
    requirement: BACKUP-01
    verification:
      - kind: integration
        ref: "docker compose exec -T app sh -c 'php artisan escola:backup; gzip -dc $d/database.sql.gz | grep -c CREATE TABLE' => 26 (>= 20) e 18 INSERT INTO"
        status: pass
    human_judgment: false
  - id: D2
    description: "Uploads (fotos e documentos do disco public) entram no mesmo backup como uploads.tar.gz"
    requirement: BACKUP-02
    verification:
      - kind: integration
        ref: "tar -tzf $d/uploads.tar.gz | grep -q 'alunos/' e sha256 conferido no manifest.json"
        status: pass
    human_judgment: false
  - id: D3
    description: "Backup diário agendado para as 02:30"
    requirement: BACKUP-01
    verification:
      - kind: integration
        ref: "php artisan schedule:list => '30 2 * * * php artisan escola:backup'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Retenção poda backups antigos e preserva nomes inválidos, datas impossíveis e o backup recém-criado"
    requirement: BACKUP-01
    verification:
      - kind: integration
        ref: "com backup-2020-01-01_000000, backup-2020-13-45_000000 e nao-e-backup no diretório: o antigo é removido, os outros dois permanecem"
        status: pass
    human_judgment: false
  - id: D5
    description: "Em produção o backup sai do volume Docker e aparece no host (2 bind mounts no compose de produção)"
    requirement: BACKUP-04
    verification:
      - kind: integration
        ref: "docker compose -f docker-compose.prod.yml config | grep -c 'target: /var/www/html/storage/app/backups' => 2"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-10-17
status: complete
---

# Phase 1: Backup e Restauração de Dados — Plano 01 Summary

**O sistema agora produz um ponto de restauração completo (banco + uploads + manifesto sha256) por dia, podado por retenção e gravado fora do volume Docker em produção.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-17T01:45Z
- **Completed:** 2026-10-17T01:50Z
- **Tasks:** 3 de 3
- **Files modified:** 13 (6 criados, 7 alterados)

## Accomplishments

- `php artisan escola:backup` gera, numa execução, `storage/app/backups/backup-AAAA-MM-DD_HHMMSS/` com `database.sql.gz` (26 tabelas do banco real de dev), `uploads.tar.gz` (fotos e documentos) e `manifest.json` com tamanho e sha256 de cada artefato.
- Retenção configurável com poda tolerante: nome fora do padrão, data impossível (`backup-2020-13-45_...`) e o backup corrente são preservados; falha de permissão em um diretório virá órfão/aviso em vez de derrubar o comando.
- Agendamento diário às 02:30 (`php artisan schedule:list` confirma `30 2 * * *`), com `withoutOverlapping(30)`, separado do job de alertas da meia-noite.
- Em produção o backup deixa de ficar preso no volume nomeado `app-storage`: bind mount `${BACKUP_HOST_PATH:-./backups}` nos serviços `app` e `scheduler` (conferido com `docker compose config` = 2 alvos).

## Task Commits

Cada tarefa foi verificada pela suíte de verificação do próprio plano e o plano fechou em um commit atômico:

1. **Tarefas 1–3 (tracer + uploads/retenção + destino recuperável)** — `071b19e` (feat)

**Plan metadata:** `(este commit)` (docs: SUMMARY do plano 01-01)

_Nota: execução inline (subagentes deste harness não expõem ferramentas de escrita), com as três tarefas commitadas juntas por serem o mesmo artefato coeso._

## Files Created/Modified

- `laravel/config/escola.php` — configuração do backup (`caminho`, `retencao_dias`, `conexao`, `binarios`)
- `laravel/app/Contracts/DatabaseDumper.php` — contrato do dump do banco
- `laravel/app/Contracts/FileArchiver.php` — contrato de compactação (`create`, `extract`, `list`)
- `laravel/app/Services/Backup/MysqldumpDumper.php` — dump via `mysqldump` com credenciais em arquivo temporário 0600
- `laravel/app/Services/Backup/TarArchiver.php` — `tar` via `Process` (args em array, sem shell)
- `laravel/app/Console/Commands/Backup.php` — comando `escola:backup` (dump, compactação, uploads, manifesto, retenção, lock)
- `laravel/app/Providers/AppServiceProvider.php` — bindings de `DatabaseDumper` e `FileArchiver`
- `laravel/routes/console.php` — agendamento diário 02:30
- `laravel/.env.example` / `laravel/.env.production.example` — `BACKUP_PATH`, `BACKUP_RETENTION_DAYS` e binários
- `laravel/docker-compose.yml` / `docker-compose.prod.yml` — destino recuperável no host
- `laravel/.gitignore` — ignora `/storage/app/backups` e `/backups`

## Decisions Made

- **Destino configurável em vez de caminho fixo:** `BACKUP_PATH` permite apontar para um diretório do host (ou outro disco) sem alterar código; o padrão `storage/app/backups` funciona sem nenhuma configuração em dev (repositório montado no container).
- **`manifest.json` como marcador de conclusão:** gravado por último; o comando de restauração (plano 01-02) o exige e a poda/catch o respeitam, o que elimina a classe de bug "restaurar um backup pela metade".
- **`? :` em vez de `env($chave, $padrao)`:** um `BACKUP_PATH=` vazio no `.env` devolveria string vazia e quebraria o destino silenciosamente.
- **Retenção fora do try/catch do backup:** isola o efeito destrutivo da poda do artefato que acabou de ser criado (endereça o blocker B2 da checagem de planos).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Bloqueio] Execução inline em vez de subagente executor**
- **Found during:** início da onda 1
- **Issue:** o fluxo de execução delega cada plano a um subagente `gsd-executor`, mas os subagentes deste harness não expõem ferramentas de escrita de arquivo (o próprio planejador precisou gravar via heredoc).
- **Fix:** execução inline pelo orquestrador, tarefa por tarefa, rodando o `<verify>` de cada tarefa antes de seguir — o próprio fluxo autoriza o fallback sequencial quando o dispatch de executor não está disponível. A verificação independente final continua sendo feita por subagente.
- **Verification:** todos os `<verify>` das 3 tarefas executados com saída registrada.
- **Committed in:** `d9a4e0a`

**2. [Rule 2 - Estilo] Pint corrigiu 2 arquivos novos**
- **Found during:** gate de estilo
- **Issue:** `unary_operator_spaces`/`not_operator_with_successor_space` em `MysqldumpDumper.php` e `TarArchiver.php`.
- **Fix:** `./vendor/bin/pint app config routes` (correção) seguido de `pint --test` limpo (75 arquivos).
- **Committed in:** `d9a4e0a`

---

**Total deviations:** 2 auto-corrigidas (1 bloqueio de ambiente, 1 estilo)
**Impact on plan:** nenhum desvio de escopo; as decisões estruturais do plano foram mantidas.

## Issues Encountered

O diretório `.planning/phases/.../backup-*` de testes manuais fica dentro de `storage/app/backups`, que é ignorado pelo git — nenhum artefato de backup foi versionado.

## User Setup Required

Em produção, adicione ao `.env.production` (já documentado no `.env.production.example`):

- `BACKUP_PATH=/var/www/html/storage/app/backups` (casando com o bind mount do compose)
- `BACKUP_RETENTION_DAYS=14` (ajuste conforme a política da escola)
- opcional: `BACKUP_HOST_PATH=/srv/escola-backups` para mudar o diretório do host sem editar o compose

## Next Phase Readiness

- Pronto para o plano 01-02 (`escola:restore-backup`): o formato do diretório de backup, o manifesto e os contratos (`DatabaseRestorer` a criar) já estão definidos e verificados.
- Preocupação registrada para o plano 01-02: em produção os comandos manuais devem rodar com `-u www-data` para não misturar donos de arquivo com o serviço `scheduler`.

---
*Phase: 01-backup-e-restaura-o-de-dados*
*Completed: 2026-10-17*
