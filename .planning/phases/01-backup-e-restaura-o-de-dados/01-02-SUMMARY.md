---
phase: 01-backup-e-restaura-o-de-dados
plan: 02
subsystem: infra
tags: [restauracao, mysql, tar, manifest, guardas, testes, runbook, deploy]

# Dependency graph
requires:
  - phase: 01-backup-e-restaura-o-de-dados
    plan: 01
    provides: "artefato de backup datado (database.sql.gz + uploads.tar.gz + manifest.json) e contratos DatabaseDumper/FileArchiver"
provides:
  - "Comando `escola:restore-backup` com --file/--force/--dry-run e guardas de integridade, coerência e produção"
  - "Contrato `DatabaseRestorer` + `MysqlClientRestorer` (dump por stdin, credenciais em arquivo 0600)"
  - "Suíte de 20 testes de backup/restauração sem depender de MySQL (dublês de dumper e restaurador)"
  - "Teste de integração opt-in que exercita o restaurador real contra MySQL"
  - "Runbook de backup e restauração (comandos como www-data, retenção, verificação, restauração passo a passo) em DEPLOY.md"
  - "Restauração que limpa cache e locks do dump, sem deixar o sistema travado"
affects: [fase de backup off-site (BACKUP-04), operação da escola]

actuals:
  tokens: 14200
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Guardas destrutivas: validar integridade → coerência → exigência de --force, sempre ANTES de qualquer escrita"
    - "Comparação de contenção de caminho COM separador final (o prefixo textual sozinho aceita `backups-evil`)"
    - "Rejeição de zip-slip no tar antes de extrair (caminho absoluto ou com `..`)"
    - "Dublê via `$this->app->bind()` registrado ANTES da primeira chamada artisan do teste (o kernel resolve os comandos no bootstrap)"
    - "Artefato real nos testes (gzip/tar/manifesto do próprio comando); só o aplicador de SQL é dublado"

key-files:
  created:
    - laravel/app/Contracts/DatabaseRestorer.php
    - laravel/app/Services/Backup/MysqlClientRestorer.php
    - laravel/app/Console/Commands/RestoreBackup.php
    - laravel/tests/Feature/BackupCommandTest.php
    - laravel/tests/Feature/BackupRetentionTest.php
    - laravel/tests/Feature/BackupRestoreTest.php
    - laravel/tests/Feature/Concerns/UsaBackupDeTeste.php
  modified:
    - laravel/app/Providers/AppServiceProvider.php
    - laravel/DEPLOY.md

key-decisions:
  - "A ordem das guardas é integridade → coerência → produção: um dump de outro ambiente é recusado com o motivo específico antes de qualquer confirmação destrutiva"
  - "`--dry-run` valida e imprime o plano (inclusive a divergência, como aviso) e nunca escreve, mesmo em produção"
  - "A coerência compara `ambiente` e `banco` do manifesto com o destino; `--force` aceita a divergência explicitamente"
  - "O dump é transmitido ao `mysql` por stdin (sem carregar o arquivo na memória) e a senha vai em arquivo temporário 0600, nunca em argumento"
  - "Uploads são restaurados de forma aditiva: sobrescreve o que existe no backup, não remove o que foi criado depois"
  - "A restauração limpa cache e locks após aplicar o dump: o snapshot traz o lock do próprio `escola:backup` e o mutex do agendador"

patterns-established:
  - "Restauração segura por padrão: dry-run documentado como passo 2 do procedimento, `--force` obrigatório em produção"
  - "Teste de integração que se auto-pula com `markTestSkipped` e roda de verdade via opt-in `ESCOLA_TEST_MYSQL_DATABASE`"

requirements-completed: [BACKUP-03]

coverage:
  - id: D1
    description: "`escola:restore-backup --force` restaura o banco e extrai os uploads de um backup real do `escola:backup`"
    requirement: BACKUP-03
    verification:
      - kind: integration
        ref: "docker compose exec -T app sh storage/verify-restore-e2e.sh => 'sentinela antes=1 / depois=0', contagens restauradas em 89 alunos / 32 frequencias / 17 turmas"
        status: pass
      - kind: unit
        ref: "tests/Feature/BackupRestoreTest.php#test_restaura_banco_e_uploads_com_force"
        status: pass
    human_judgment: false
  - id: D2
    description: "O verify ponta a ponta não é tautológico: sem restaurar de verdade a sentinela permanece"
    requirement: BACKUP-03
    verification:
      - kind: integration
        ref: "docker compose exec -T app sh storage/verify-guardas.sh => 'SENSIBILIDADE OK: sem restaurar de verdade a sentinela permanece (1), e o verify E2E reprovaria'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Em produção sem `--force` o comando recusa, retorna 1 e diz exatamente o que seria sobrescrito"
    requirement: BACKUP-03
    verification:
      - kind: unit
        ref: "tests/Feature/BackupRestoreTest.php#test_em_producao_sem_force_recusa_e_nao_escreve"
        status: pass
      - kind: integration
        ref: "verify-guardas.sh => 'GUARDA DE PRODUCAO OK: recusou sem --force, retornou 1 e detalhou o que seria sobrescrito'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Backup de outro ambiente/banco é recusado sem `--force` (com comparação lado a lado) e aceito com `--force`"
    requirement: BACKUP-03
    verification:
      - kind: unit
        ref: "tests/Feature/BackupRestoreTest.php#test_manifesto_de_outro_ambiente_e_recusado_sem_force e #test_manifesto_de_outro_banco_e_recusado_sem_force_e_aceito_com_force"
        status: pass
    human_judgment: false
  - id: D5
    description: "`--dry-run` mostra o plano e as divergências sem escrever nada (inclusive em produção)"
    requirement: BACKUP-03
    verification:
      - kind: unit
        ref: "tests/Feature/BackupRestoreTest.php#test_dry_run_mostra_o_plano_sem_escrever e #test_dry_run_com_manifesto_divergente_avisa_sem_escrever"
        status: pass
    human_judgment: false
  - id: D6
    description: "Artefato inválido (manifesto ausente, sha256 divergente, sha256 ausente, formato ausente/desconhecido) é recusado sem escrever"
    requirement: BACKUP-03
    verification:
      - kind: unit
        ref: "tests/Feature/BackupRestoreTest.php#test_backup_sem_manifesto_e_recusado e #test_artefato_invalido_e_recusado_nos_quatro_casos"
        status: pass
    human_judgment: false
  - id: D7
    description: "`--file` só aceita caminho dentro do diretório de backups (recusa inexistente, fora do diretório e o irmão `backups-evil` de prefixo comum)"
    requirement: BACKUP-03
    verification:
      - kind: unit
        ref: "tests/Feature/BackupRestoreTest.php#test_arquivo_inexistente_fora_do_diretorio_e_irmao_de_prefixo_comum_sao_recusados"
        status: pass
    human_judgment: false
  - id: D8
    description: "Uploads com caminho malicioso (`../`, zip-slip) são recusados antes de extrair, mesmo com sha256 correto no manifesto"
    requirement: BACKUP-03
    verification:
      - kind: unit
        ref: "tests/Feature/BackupRestoreTest.php#test_tar_com_caminho_malicioso_e_recusado_mesmo_com_hash_correto"
        status: pass
    human_judgment: false
  - id: D9
    description: "O `MysqlClientRestorer` real aplica um dump no MySQL (streaming por stdin, credenciais fora da linha de comando)"
    requirement: BACKUP-03
    verification:
      - kind: integration
        ref: "docker compose exec -T -e ESCOLA_TEST_MYSQL_DATABASE=escola app php artisan test --filter=BackupRestoreTest => 13 passed (o teste de integração roda de verdade)"
        status: pass
    human_judgment: false
  - id: D10
    description: "O comando de backup segue coberto (dump/manifesto, uploads, retenção) por suíte automatizada"
    requirement: BACKUP-01
    verification:
      - kind: unit
        ref: "tests/Feature/BackupCommandTest.php e tests/Feature/BackupRetentionTest.php (8 testes)"
        status: pass
    human_judgment: false
  - id: D11
    description: "O runbook documenta onde os backups ficam, a rotina diária e o procedimento de restauração em produção"
    requirement: BACKUP-03
    verification:
      - kind: manual_procedural
        ref: "DEPLOY.md §Backup: contém `escola:restore-backup`, `BACKUP_HOST_PATH`, `php artisan down`, `exec -u www-data` e a explicação da restauração aditiva de uploads"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-10-17
status: complete
---

# Phase 1: Backup e Restauração de Dados — Plano 02 Summary

**O backup agora pode voltar: `escola:restore-backup` restaura banco e uploads, mas só depois de provar integridade, coerência de ambiente/banco e a confirmação destrutiva explícita — e faz isso comprovadamente de verdade (a sentinela inserida depois do backup some).**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-17T02:00Z
- **Completed:** 2026-10-17T02:55Z
- **Tasks:** 3 de 3
- **Files modified:** 9 (7 criados, 2 alterados)

## Accomplishments

- `php artisan escola:restore-backup` descompacta o dump, aplica no banco (streaming por stdin) e extrai os uploads; `--dry-run` mostra o plano sem escrever, `--file=<diretório>` escolhe o backup, `--force` confirma a sobrescrita.
- Guardas que decidem **antes** de escrever: manifesto presente, `formato: 1`, sha256 de cada artefato, coerência de `ambiente`/`banco` com o destino, contenção de caminho (com separador final — o irmão `backups-evil` é recusado), zip-slip no tar e exigência de `--force` em produção.
- Suíte de **20 testes** de backup/restauração com artefato **real** (gzip, tar e manifesto do próprio comando) e apenas o aplicador de SQL dublado: o verify roda no SQLite em memória e cobre sucesso, todas as recusas e a retenção.
- Teste de integração que exercita o `MysqlClientRestorer` **real** contra o MySQL (opt-in): rodou de verdade em 13/13 com `ESCOLA_TEST_MYSQL_DATABASE=escola`.
- **Defeito real encontrado pelo verify não-tautológico:** o dump restaurado traz de volta o lock do próprio `escola:backup` (e o mutex do agendador), deixando o sistema recém-restaurado travado por até 10 minutos ("Já existe um backup em execução"). Corrigido com `Cache::flush()` + `flushLocks()` do store após a restauração do banco.
- Runbook em `DEPLOY.md`: onde os backups ficam (e por que `BACKUP_HOST_PATH` é o que torna o backup recuperável), comandos como `www-data`, rotina de 02:30, retenção de 14 dias, verificação manual e restauração passo a passo com `down`/`--dry-run`/`--force`/`up`.

## Task Commits

Cada tarefa foi verificada pela suíte de verificação do próprio plano e o plano fechou em um commit atômico:

1. **Tarefas 1–3 (restaurador + guardas, suíte de testes, runbook)** — `9137e72` (feat)

**Plan metadata:** `(este commit)` (docs: SUMMARY do plano 01-02)

_Nota: execução inline (subagentes deste harness não expõem ferramentas de escrita), com as três tarefas commitadas juntas por serem o mesmo artefato coeso._

## Files Created/Modified

- `laravel/app/Contracts/DatabaseRestorer.php` — contrato do aplicador de SQL
- `laravel/app/Services/Backup/MysqlClientRestorer.php` — `mysql` por `Process` com stdin e `--defaults-extra-file` 0600
- `laravel/app/Console/Commands/RestoreBackup.php` — `escola:restore-backup` com todas as guardas, `--dry-run`, limpeza de cache/locks e resumo final
- `laravel/app/Providers/AppServiceProvider.php` — binding de `DatabaseRestorer`
- `laravel/tests/Feature/BackupCommandTest.php` — dump/manifesto, uploads, falha no dump e falha pós-manifesto
- `laravel/tests/Feature/BackupRetentionTest.php` — poda, preservação de nomes inválidos e datas impossíveis, config vs `--retention-days`
- `laravel/tests/Feature/BackupRestoreTest.php` — 14 testes de restauração e guardas (incluindo a integração opt-in)
- `laravel/tests/Feature/Concerns/UsaBackupDeTeste.php` — fabricantes dos dublês e utilidades de backup
- `laravel/DEPLOY.md` — §Backup reescrita como runbook

## Decisions Made

- **`--dry-run` antes de `--force`:** o procedimento de produção documentado é `down` → `--dry-run` → `--force` → `up`; o dry-run vê as mesmas guardas e imprime a divergência como aviso, mas nunca escreve.
- **Coerência antes da guarda de produção:** a divergência de ambiente é o motivo mais específico (e mais perigoso) e aparece primeiro; `--force` é a confirmação que cobre os dois casos.
- **Contenção com separador final:** `str_starts_with($real, $base)` aceitaria `/…/backups-evil` para `$base = /…/backups`; a comparação normaliza com `DIRECTORY_SEPARATOR` no fim. Há teste dedicado com esse diretório irmão.
- **Zip-slip recusado antes de extrair:** o tar é listado e validado; caminho absoluto ou com `..` aborta a restauração em vez de confiar no `tar`.
- **Integração por opt-in (`ESCOLA_TEST_MYSQL_DATABASE`)** em vez de trocar `DB_DATABASE`: manter a suíte em `:memory:` evita criar um arquivo SQLite espúrio (`laravel/escola`) e desacopla o teste da conexão padrão.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] O dump restaurado trazia de volta o lock do `escola:backup`**
- **Found during:** verify E2E da tarefa 1 (a execução seguinte falhava com "Já existe um backup em execução")
- **Issue:** o dump é gerado *durante* a execução do backup, então o `cache_locks` (e o mutex do agendador) do instante entram no snapshot; ao restaurar, o sistema voltava travado até o lock expirar (~10 min). Em produção isso pode fazer o backup diário ser pulado.
- **Fix:** após aplicar o dump, `Cache::flush()` + `flushLocks()` do store (o `database` guarda os locks em tabela separada, que o `flush()` não limpa).
- **Verification:** duas execuções consecutivas do roteiro E2E (a segunda depende do lock não voltar) — antes falhava, agora passa; documentado no runbook.
- **Committed in:** `9137e72`

**2. [Rule 1 - Bug] API do plano incorreta: `PendingProcess::setInput()` não existe**
- **Found during:** tarefa 1, antes de escrever o restaurador
- **Issue:** o plano mandava usar `Process::...->setInput(fopen(...))`; o método do `PendingProcess` do Laravel chama-se `input()` (`setInput()` é da classe `Process` do Symfony, que o Laravel chama internamente).
- **Fix:** `->input($handle)`, com o dump em streaming por stdin.
- **Verification:** teste de integração com o MySQL real (13/13) aplicou o SQL.
- **Committed in:** `9137e72`

**3. [Rule 3 - Bloqueio] Bindings de teste precisam vir ANTES da primeira chamada artisan**
- **Found during:** primeira execução dos testes (4 falhas no caminho de sucesso, com "Nome de banco inválido para a restauração: :memory:")
- **Issue:** o kernel de console instancia os comandos no bootstrap, então um `$this->app->bind(DatabaseRestorer::class, ...)` feito depois da primeira chamada `artisan` do teste não alcança o comando já resolvido — a asserção observava um dublê que nunca era chamado.
- **Fix:** o helper `criarBackup()` registra o restaurador dublê antes de executar `escola:backup`, e `restauradorFalso()` memoiza a instância (uma por teste, a mesma que o comando usa).
- **Verification:** 20 testes de backup/restauração passando.
- **Committed in:** `9137e72`

**4. [Rule 3 - Bloqueio] Verify do plano era inalcançável naquela forma (ordem das guardas)**
- **Found during:** verify de guardas da tarefa 1
- **Issue:** `APP_ENV=production php artisan escola:restore-backup` com um backup gerado em `local` dispara (corretamente) a guarda de **coerência** antes da guarda de produção, então a mensagem esperada pelo plano não aparece. O plano listava coerência antes de produção e mesmo assim esperava a mensagem de produção.
- **Fix:** o verify passou a testar os dois guardas: ambiente divergente (mensagem com a comparação lado a lado) e manifesto coerente gerado em produção (mensagem de `--force` obrigatório).
- **Verification:** `verify-guardas.sh` => "GUARDA DE COERENCIA OK" e "GUARDA DE PRODUCAO OK".
- **Committed in:** `9137e72`

**5. [Rule 2 - Estilo] Pint corrigiu os arquivos novos**
- **Found during:** gate de estilo
- **Issue:** `unary_operator_spaces`/`not_operator_with_successor_space` em `MysqlClientRestorer.php` e nos testes.
- **Fix:** `./vendor/bin/pint app tests config routes` e `pint --test` limpo (78 arquivos).
- **Committed in:** `9137e72`

**6. [Rule 2 - Estrutura] Um arquivo a mais que o plano previa**
- **Found during:** tarefa 2
- **Issue:** os três arquivos de teste compartilhariam os mesmos fabricantes de dublês e utilidades (diretório de backup, sha/gzip/tar) — duplicação grande e divergente.
- **Fix:** extraídos para `tests/Feature/Concerns/UsaBackupDeTeste.php` (trait); os dublês continuam sendo criados dentro de cada teste, como o plano exige.
- **Committed in:** `9137e72`

### Deliberate Supersets

- O plano pedia 18 comportamentos; a suíte cobre **20** (acrescenta um controle positivo de `--file` com o nome do diretório e a retenção negativa recusada sem criar backup).
- Um teste a mais que o previsto no desenho: `test_em_producao_com_force_restaura` (garante que a guarda não bloqueia o caminho legítimo).

---

**Total deviations:** 6 auto-corrigidas (3 bugs/bloqueios reais, 2 estilo/estrutura) + 2 supersets deliberados
**Impact on plan:** nenhum desvio de escopo; o único comportamento novo é a limpeza de cache/locks após restaurar — correção de um defeito que o próprio verify não-tautológico expôs.

## Issues Encountered

- A suíte completa roda em ~3s; o teste de integração com MySQL custa ~0,13s quando habilitado.
- Rodei o verify E2E contra o banco de desenvolvimento real (89 alunos / 32 frequências / 17 turmas): a restauração devolve exatamente o snapshot e a sentinela é revertida; o banco ficou consistente ao final.
- Diretórios `backup-*` gerados nos testes manuais ficam em `storage/app/backups` (ignorado pelo git) e são podados pela retenção.

## User Setup Required

Em produção, além do que já está no `.env.production.example`:

- `BACKUP_HOST_PATH=/srv/escola-backups` (diretório do host, fora da árvore do projeto) e `BACKUP_PATH=/var/www/html/storage/app/backups` (caminho de dentro do container) casando com o compose.
- Rodar os comandos manuais de backup/restauração com `-u www-data`.
- Enquanto não existir cópia off-site (BACKUP-04), replicar periodicamente o diretório de backup para outro lugar: hoje o backup não protege contra a perda do servidor.

## Next Phase Readiness

- Requisitos BACKUP-01, BACKUP-02 e BACKUP-03 entregues; a fase 1 está pronta para verificação independente.
- Preocupação registrada para o próximo release: `BACKUP-04` (off-site) e a restauração aditiva de uploads (não remove arquivos criados depois do backup) são limitações conhecidas e documentadas, não pendências ocultas.

---
*Phase: 01-backup-e-restaura-o-de-dados*
*Completed: 2026-10-17*
