---
phase: 01-backup-e-restaura-o-de-dados
verified: 2026-10-17T05:17:17Z
status: passed
score: 16/16 must-haves verificados (+1 guarda extra de contenção de caminho, verificada por mutação)
behavior_unverified: 0
covered_files:
  - .planning/phases/01-backup-e-restaura-o-de-dados/01-01-PLAN.md
  - .planning/phases/01-backup-e-restaura-o-de-dados/01-02-PLAN.md
  - .planning/phases/01-backup-e-restaura-o-de-dados/01-01-SUMMARY.md
  - .planning/phases/01-backup-e-restaura-o-de-dados/01-02-SUMMARY.md
  - laravel/app/Console/Commands/Backup.php
  - laravel/app/Console/Commands/RestoreBackup.php
  - laravel/app/Contracts/DatabaseDumper.php
  - laravel/app/Contracts/FileArchiver.php
  - laravel/app/Contracts/DatabaseRestorer.php
  - laravel/app/Services/Backup/MysqldumpDumper.php
  - laravel/app/Services/Backup/TarArchiver.php
  - laravel/app/Services/Backup/MysqlClientRestorer.php
  - laravel/config/escola.php
  - laravel/routes/console.php
  - laravel/docker-compose.prod.yml
  - laravel/DEPLOY.md
  - laravel/tests/Feature/BackupCommandTest.php
  - laravel/tests/Feature/BackupRetentionTest.php
  - laravel/tests/Feature/BackupRestoreTest.php
---

# Phase 1: Backup e Restauração de Dados — Relatório de Verificação

**Goal da fase:** "Os dados da escola sobrevivem a falhas: banco e uploads são copiados automaticamente todos os dias e a restauração foi executada com sucesso pelo menos uma vez"
**Verificado em:** 2026-10-17T05:17:17Z (02:17 America/Sao_Paulo) — **reverificação** após o commit `9913f91` (`fix(backup): retencao zero recusada e poda nunca toca no backup da execucao`), que corrige as duas ressalvas ⚠️ da verificação anterior.
**Status:** passed — objetivo e os 4 Success Criteria atingidos com evidência executada de ponta a ponta contra MySQL 8.4 real; as duas ressalvas anteriores foram **reconfirmadas por mutação de código** (as duas guardas são load-bearing e os testes reprovam sem elas).

## Goal Achievement

### Observable Truths

| # | Verdade (must-have) | Status | Evidência |
|---|---------------------|--------|-----------|
| 1 (01-01) | `escola:backup` cria, em uma execução, `storage/app/backups/backup-AAAA-MM-DD_HHMMSS/` com `database.sql.gz`, `uploads.tar.gz` e `manifest.json` (gravado por último, chave `formato`) | ✓ VERIFIED | `php artisan escola:backup` → EXIT=0 e `/var/www/html/storage/app/backups/backup-2026-10-17_020120` com exatamente 3 arquivos: `database.sql.gz` (40.750 B), `uploads.tar.gz` (83.896 B), `manifest.json` (603 B). Manifesto: `"formato": 1, "ambiente": "local", "conexao": "mysql", "banco": "escola", "retencao_dias": 14`. Ordem "manifesto por último" confirmada no código de `handle()` e pelos testes `test_falha_no_dump_nao_deixa_diretorio_pela_metade` e `test_falha_depois_do_manifesto_preserva_o_backup_completo` (✓). |
| 2 (01-01) | O dump é conferido por CONTEÚDO: `gzip -t` valida, sha256 do manifesto confere, o SQL tem as tabelas (≥20 `CREATE TABLE`) e ≥1 `INSERT INTO` | ✓ VERIFIED | `gzip -t` OK nos dois artefatos. `grep -c "^CREATE TABLE"` = **26** (alunos, frequencias, turmas, diario_classe, professoras, users, …); `grep -c "^INSERT INTO"` = **17**. `sha256sum` recalculado por mim: `2c8c1fdb386327b680741c6ba77bcf75be3683c411d0e62f79f85839653450aa` e `b0f7466ed35b309d546e07acd54eb776e0814dc2cdf894594b04f10f768a63e9` — **idênticos** ao manifesto. |
| 3 (01-01) | Fotos e documentos de alunos e professoras (disco `public`) estão dentro de `uploads.tar.gz` | ✓ VERIFIED | Backup real: `tar -tzf` = 8 entradas, incluindo as duas fotos que são os únicos arquivos de `find storage/app/public -type f`. Sonda de **documentos**: criei `alunos/documentos/VERIF-doc-aluno.pdf` e `professoras/documentos/VERIF-doc-profe.pdf`, rodei o backup e o tar do `backup-2026-10-17_020734` continha as duas entradas. `Media::storeDocument()` usa `storePublicly($dir,'public')` — documentos vão para o mesmo disco arquivado. |
| 4 (01-01) | Retenção remove o que é mais antigo que a config, é tolerante por diretório e nome com data impossível (`backup-2020-13-45_000000`) é preservado; **retenção 0 ou negativa é recusada sem criar nem podar nada (pós-`9913f91`)** | ✓ VERIFIED | **Execução real** (`--retention-days=1`) com `backup-2020-01-01_000000` plantado: `Retenção: 1 removido(s), 2 ignorado(s), 0 órfão(s)` + EXIT=0; depois: antigo **removido**, `backup-2020-13-45_000000` e `nao-e-backup` **preservados**, novo `backup-2026-10-17_021640` **preservado**. **Recusa de zero (nova):** `php artisan escola:backup --retention-days=0` → `A retenção em dias precisa ser pelo menos 1 (recebido: 0).` `exit=1`, e a contagem de diretórios ficou **11 → 11** (nem criou, nem podou). `php artisan test --filter=BackupRetentionTest` → `5 passed (17 assertions)`, incluindo `retencao zero ou negativa e recusada sem criar backup` (cobre 0 e -1) e `a poda nunca remove o backup da execucao corrente`. |
| 5 (01-01) | Uma falha depois da escrita do `manifest.json` NÃO apaga o backup válido; a poda nunca toca no diretório da execução corrente | ✓ VERIFIED | `handle()` valida a retenção **antes** de criar diretório (`$retencaoDias < 1` → `FAILURE`, sem `criarDiretorio()`, verificado no caso 4). A poda roda fora do try/catch e `descartarDiretorioIncompleto()` retorna cedo com manifesto presente. **Novo em `9913f91`:** `private ?string $diretorioDaExecucao` (preenchida logo após `criarDiretorio()`) + `if (…) { continue; }` como **primeira** checagem de `aplicarRetencao()`. **Prova por mutação:** desativando a guarda (`if (false && …)`) o teste `test_a_poda_nunca_remove_o_backup_da_execucao_corrente` **FALHA** — `ErrorException: filesize(): stat failed for …/backups/backup-2026-10-17_021414/database.sql.gz` em `Backup.php:322` (o backup do dia foi podado e o comando morreu); restaurado o código, `BackupRetentionTest` volta a `5 passed`. A guarda é código executável, não comentário. O ℹ️ residual (barra final em `BACKUP_PATH`) foi corrigido depois em `c818bbb` — ver Adendo. |
| 6 (01-01) | O backup roda todos os dias às 02:30 (America/Sao_Paulo), sem intervenção manual, pelo serviço `scheduler` em produção | ✓ VERIFIED | `php artisan schedule:list` → `30 2 * * *  php artisan escola:backup … Next Due: em 28 minutos` (executado 02:01). Timezone do processo: `America/Sao_Paulo` (`now()->toDateTimeString()` = `2026-10-17 02:05:44`). `docker-compose.prod.yml` tem o serviço `scheduler` com `command: php artisan schedule:work` e o bind mount de backup. **Limite:** não observei uma execução disparada pelo scheduler — ver Human Verification. |
| 7 (01-01) | Em produção o diretório de backup é bind mount do host, fora do volume nomeado `app-storage` | ✓ VERIFIED | `docker compose -f docker-compose.prod.yml config --format json`: `app` e `scheduler` com `{"tipo":"bind","destino":"/var/www/html/storage/app/backups"}`; `queue`/`mysql` não. Com `BACKUP_HOST_PATH=/srv/escola-backups` os dois `source` viram `/srv/escola-backups`. **Pós-`9913f91`**, repetido lendo o exemplo como env-file (`--env-file .env.production.example`, agora com `BACKUP_HOST_PATH=./backups` ativo): ambos resolvem para `/home/canc90/sistema escolar/laravel/backups` e o total continua **2**. |
| 8 (01-02) | `escola:restore-backup` restaura banco e uploads a partir de um diretório do `escola:backup` | ✓ VERIFIED | Executado de verdade: removi a foto do disco público → `php artisan escola:restore-backup --force` → `Uploads: 8 entrada(s) extraída(s)` + `Restauração concluída.`; a foto voltou com **sha256 idêntico** (`sha256sum -c` = OK). Banco: 89 alunos restaurados do dump real via binário `mysql`. |
| 9 (01-02) | O verify ponta a ponta NÃO é tautológico: sentinela em `alunos` inserida DEPOIS do backup desaparece e as contagens voltam ao snapshot | ✓ VERIFIED | Roteiro próprio no container: `ANTES = 89 32 17 0` → `APOS_INSERT = 90 32 17 1` → `--dry-run` → `APOS_DRYRUN = 90 32 17 1` (não escreveu) → `--force` → `DEPOIS = 89 32 17 0` → `RESULTADO[restore]: ROTEIRO PASSOU` (exit 0). **Sensibilidade:** trocando o comando por `true`: `DEPOIS = 90 32 17 1`, `FALHA: a sentinela PERMANECEU`, exit 1. |
| 10 (01-02) | Um teste de integração exercita o `MysqlClientRestorer` REAL contra MySQL; sem banco ele se auto-pula com `markTestSkipped` | ✓ VERIFIED | `docker compose exec -T -e ESCOLA_TEST_MYSQL_DATABASE=escola app php artisan test --filter=BackupRestoreTest` → `13 passed (88 assertions)` com `✓ restaurador real aplica o sql no mysql quando ha banco 0.09s` (rodou, não pulou). Na execução padrão o mesmo teste aparece como `- … → Sem banco MySQL acessível…` (auto-skip). |
| 11 (01-02) | Com `APP_ENV=production` e sem `--force`, o comando recusa e não escreve nada | ✓ VERIFIED | `APP_ENV=production DB_* … php artisan escola:restore-backup --file=verif-prod` → exit 1, `Restauração recusada: em produção é obrigatório passar --force para sobrescrever dados.` Sentinela no banco **intacta** (1) e foto continuou ausente → nada escrito. |
| 12 (01-02) | Artefato sem `manifest.json`, com `formato` não suportado ou sha256 divergente é rejeitado antes de qualquer escrita | ✓ VERIFIED | Sem manifesto: exit 1, `Backup incompleto: manifest.json não encontrado em verif-nomanifest.` Sha divergente (anexei `lixo` ao `database.sql.gz`): exit 1, `Artefato database.sql.gz corrompido: o sha256 não confere com o manifesto.` `formato` ausente/`2`: teste `test_artefato_invalido_e_recusado_nos_quatro_casos` ✓ (4 casos). Em todas as recusas a sentinela permaneceu e a foto não foi extraída. |
| 13 (01-02) | Manifesto com `ambiente` ou `banco` divergente é recusado sem `--force`, com a comparação impressa (inclusive no `--dry-run`) | ✓ VERIFIED | `--file=verif-prod` → exit 1, `ambiente do backup=production / ambiente atual=local`. `--file=verif-banco` → exit 1, `banco do backup=outro_banco / banco atual=escola`. `--dry-run --file=verif-prod` → exit 0 com plano + divergências + `divergência: seria recusada sem --force`, sem escrever. |
| 14 (01-02) | `--dry-run` valida o artefato e mostra o que seria restaurado sem escrever nada | ✓ VERIFIED | Tabela Origem/Gerado em/Formato/Dump/Uploads/Banco de destino/Ambiente + `Nada foi escrito: este é apenas o plano (--dry-run).`; sentinela e foto intactas em todos os `--dry-run`. |
| 15 (01-02) | `php artisan test --filter=Backup` cobre backup, retenção, restauração e guardas sem exigir MySQL real | ✓ VERIFIED | `21 passed, 1 skipped (128 assertions)` (eram 20 antes do `9913f91`); o único pulado é o de integração MySQL. SQLite `:memory:` (`phpunit.xml`: `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `CACHE_STORE=array`). |
| 16 (01-02) | `DEPLOY.md` descreve como restaurar banco e uploads (como `www-data` em produção) e onde os backups ficam | ✓ VERIFIED | §`## Backup` (linhas 118–235) conferida contra `--help` real: `--file[=FILE]`, `--force`, `--dry-run` são exatamente as opções; ordem `down`/`dry-run`/`--force`/`up`; `--file=backup-2026-10-17_020209` (formato documentado) → exit 0. `-u www-data` explicado; risco do backup dentro do volume `app-storage` explicado; limitação **aditiva** dos uploads declarada. Nenhum comando da documentação falhou como escrito. |
| **EXTRA (01-02)** | **Guarda de contenção de caminho: `--file` só aceita caminho dentro do diretório de backups — recusa inexistente, fora do diretório e o irmão `backups-evil` de prefixo textual comum** | ✓ VERIFIED | Recusa ao vivo: `--file=nao-existe` (exit 1) e `--file=/tmp` / `--file=../backups-evil/…` / `--file=<base>-evil/…` → `O caminho informado não fica dentro do diretório de backups: …` (exit 1). **Mutação (o teste que antes passava agora REPROVA):** removendo o separador final (`str_starts_with($real, rtrim($base, DIRECTORY_SEPARATOR))`) o teste `test_arquivo_inexistente_fora_do_diretorio_e_irmao_de_prefixo_comum_sao_recusados` **FALHA** — `Unexpected status code 0 was received. Failed asserting that 0 is not equal to 0.` (`BackupRestoreTest.php:371`): o irmão com artefato válido foi **restaurado**. Restaurado o código, o teste volta a `1 passed (10 assertions)`. |

**Score:** 16/16 must-haves verificados (+1 guarda extra, verificada por mutação)

### Required Artifacts

| Artefato | Esperado | Status | Detalhes |
|---|---|---|---|
| `laravel/config/escola.php` | caminho/retenção/conexão/binários | ✓ EXISTS + SUBSTANTIVE | `env('BACKUP_PATH') ?: storage_path('app/backups')`, `BACKUP_RETENTION_DAYS` (14), `DB_CONNECTION`, `BACKUP_*_BINARY`. |
| `app/Contracts/{DatabaseDumper,FileArchiver,DatabaseRestorer}.php` | 3 interfaces | ✓ EXISTS + SUBSTANTIVE | `dump()`, `create()/extract()/list()` (doc de extract ADITIVO), `restore()`. |
| `app/Services/Backup/MysqldumpDumper.php` | dump via binário, sem senha em argv | ✓ EXISTS + SUBSTANTIVE | `--defaults-extra-file` `0600` removido em `finally`; args em array; valida o nome do banco. Produziu dump real de 26 tabelas. |
| `app/Services/Backup/TarArchiver.php` | criar/extrair/listar | ✓ EXISTS + SUBSTANTIVE | `tar -czf/-xzf/-tzf` com array; `--no-same-owner --no-same-permissions`. |
| `app/Services/Backup/MysqlClientRestorer.php` | aplicar SQL em streaming | ✓ EXISTS + SUBSTANTIVE | `Process::input(fopen)`, credenciais `0600`; exercitado de verdade. |
| `app/Console/Commands/Backup.php` | comando completo + retenção + recusa de `<1` + proteção do diretório corrente | ✓ EXISTS + SUBSTANTIVE | 331 linhas; lock `Cache::lock('escola:backup',600)`; `$retencaoDias < 1` → `FAILURE` antes de qualquer diretório; `private ?string $diretorioDaExecucao`; `aplicarRetencao()` com `continue` na primeira checagem (as duas mudanças provadas por mutação; a normalização da barra final foi somada em `c818bbb`). |
| `app/Console/Commands/RestoreBackup.php` | comando + guardas | ✓ EXISTS + SUBSTANTIVE | 423 linhas; guardas antes de `aplicar()`; contenção com separador final (provada load-bearing por mutação). |
| `app/Providers/AppServiceProvider.php` | bindings | ✓ EXISTS + SUBSTANTIVE | 3 bindings; resolvidos em execução real. |
| `routes/console.php` | agendamento | ✓ EXISTS + SUBSTANTIVE | `Schedule::command('escola:backup')->dailyAt('02:30')->withoutOverlapping(30)`. |
| `tests/Feature/{BackupCommandTest,BackupRetentionTest,BackupRestoreTest}.php` + `Concerns/UsaBackupDeTeste.php` | suíte | ✓ EXISTS + SUBSTANTIVE | 22 testes (23 com o teste da barra final de `c818bbb`), 22 passam + 1 auto-pulado. Dois testes novos em `9913f91` e o fixture do irmão agora é cópia de artefato válido. |
| `laravel/docker-compose.prod.yml` | bind mount | ✓ EXISTS + SUBSTANTIVE | 2 bind mounts de backup (app, scheduler) via `${BACKUP_HOST_PATH:-./backups}`. |
| `laravel/docker-compose.yml` | nota do dev | ✓ EXISTS + SUBSTANTIVE | Comentário do backup manual; repo montado inteiro. |
| `laravel/.env.example` / `.env.production.example` | documentar envs | ✓ EXISTS + SUBSTANTIVE | `.env.example`: `BACKUP_PATH=`, `BACKUP_RETENTION_DAYS=14`. `.env.production.example`: `BACKUP_HOST_PATH=./backups` (linha ativa desde `9913f91`, validada via `--env-file`), `BACKUP_PATH=/var/www/html/storage/app/backups`, `BACKUP_RETENTION_DAYS=14`. `APP_TIMEZONE=America/Sao_Paulo` nos dois. |
| `laravel/.gitignore` | ignorar backups | ✓ EXISTS + SUBSTANTIVE | `/storage/app/backups`, `/backups` (commit `071b19e`). |
| `laravel/DEPLOY.md` | runbook | ✓ EXISTS + SUBSTANTIVE | §Backup com onde ficam, `www-data`, rotina, verificação manual, restauração, dados sensíveis e "o que ainda não existe" (BACKUP-04 off-site). |

### Key Link Verification

| De | Para | Via | Status | Detalhes |
|---|---|---|---|---|
| `AppServiceProvider::register()` | `DatabaseDumper→MysqldumpDumper`, `FileArchiver→TarArchiver`, `DatabaseRestorer→MysqlClientRestorer` | `$this->app->bind(...)` | ✓ WIRED | Código lido; comprovado em execução (dump MySQL real + restauração via `mysql`). |
| `routes/console.php` | `escola:backup` diário às 02:30 | `Schedule::command(...)->dailyAt('02:30')` | ✓ WIRED | `schedule:list` → `30 2 * * *  php artisan escola:backup`. |
| `docker-compose.prod.yml` | `${BACKUP_HOST_PATH:-./backups}` → `/var/www/html/storage/app/backups` em `app` e `scheduler` | bind mount | ✓ WIRED | `config --format json`: exatamente 2 montagens; com `/srv/escola-backups` e com o valor do exemplo (`./backups`) os dois `source` mudam juntos. |
| `config/escola.php` | `BACKUP_PATH`, `BACKUP_RETENTION_DAYS`, binários | `env()` | ✓ WIRED | `BACKUP_RETENTION_DAYS=0` → `14` (o env é lido); `BACKUP_PATH` controlou o destino nas sondas. |
| `Backup::$diretorioDaExecucao` | `aplicarRetencao()` | comparação `===` + `continue` | ✓ WIRED | Provado por mutação: sem o `continue` o backup do dia é podado e o comando morre em `Backup.php:322`. Normalização da barra final somada em `c818bbb` (Adendo). |
| `RestoreBackup` | `FileArchiver::list()` / `extract()` | reuso do plano 01-01 | ✓ WIRED | `conferirEntradasDosUploads()` usa `list()` antes de extrair; `aplicar()` usa `extract()`; resumo imprimiu `8 entrada(s) extraída(s)`. |
| `RestoreBackup::validarArtefato()`/`divergenciasDeCoerencia()` | guardas ANTES de qualquer escrita | ordem em `handle()` | ✓ WIRED | `resolverBackup → validarArtefato → divergenciasDeCoerencia → (dry-run) → confirmarCoerencia → confirmarProducao → aplicar`. Em 11 recusas executadas a sentinela permaneceu e a foto não foi extraída. |

## Requirements Coverage

| Requisito | Status | Bloqueio |
|---|---|---|
| BACKUP-01 (backup diário automático, dump compactado, retenção configurável) | ✓ SATISFIED | Nenhum. 26 `CREATE TABLE`/17 `INSERT INTO` no `database.sql.gz` real, agendado `30 2 * * *`, retenção 14 dias, `--retention-days=0` recusado sem criar/podar, poda protegida contra o backup do dia. |
| BACKUP-02 (o backup diário inclui os arquivos enviados) | ✓ SATISFIED | Nenhum. Fotos de alunos/professoras verificadas no tar real; documentos verificados por sonda; `Media` grava fotos e documentos no mesmo disco arquivado. |
| BACKUP-03 (restauração documentada e coberta por teste automatizado) | ✓ SATISFIED | Nenhum. Restauração executada de verdade (banco + uploads) com prova anti-tautológica; `--filter=Backup` verde sem MySQL (21 ✓); teste de integração do restaurador real roda e passa; runbook coerente com o `--help`; guarda de contenção agora tem teste que a falsifica. |

**Coverage:** 3/3 requisitos satisfeitos

## Anti-Patterns Found

| Arquivo | Trecho | Padrão | Severidade | Impacto |
|---|---|---|---|---|
| `app/Console/Commands/RestoreBackup.php` (`conferirEntradasDosUploads`) | só valida `..`/caminho absoluto | Vetor de link simbólico não filtrado | ℹ️ info | Sonda própria: tar com `fuga -> /var/www/html/storage/verif-alvo` **sem** `..` em nenhum nome passa no `list()`. O GNU tar não armazena `fuga/invadido.txt` e **recusou escrever através** do symlink (`verif-alvo` ficou vazio), mas o symlink hostil fica plantado dentro do disco `public`. Risco baixo: exige escrita no diretório de backups + recálculo do sha256. |
| `tests/Feature/*` | dumper dublado | Cobertura parcial do caminho real | ℹ️ info | `grep -rn MysqldumpDumper tests/` = **nenhum resultado**: o `escola:backup` real (mysqldump) é provado por execução manual + pela restauração E2E, mas não há teste de integração do dumper (embora exista do restaurador). |
| Nenhum no restante | — | Segredos/`ps`/stubs/erro engolido | ✓ | Zero `TODO/FIXME/XXX/stub` nos arquivos da fase; zero senha/secret hardcoded; dumps e uploads não versionados; senha nunca em argv (`--defaults-extra-file` `0600` nos dois binários); nenhum `catch` que engula erro em silêncio; a restauração só escreve em `aplicar()`, sempre depois de todas as guardas. |

### Corrigidos após a verificação (commit 9913f91)

| Ressalva anterior (⚠️) | Correção aplicada | Evidência de que a correção funciona | Evidência de que o teste passou a discriminar |
|---|---|---|---|
| `--retention-days=0` apagava o backup recém-criado e estourava `filesize()` em `Backup.php:308` (exit 1 com stack trace); a cláusula absoluta "nunca remove um diretório que contenha `manifest.json`" era falsa nesse caminho | (1) `$retencaoDias < 0` → `$retencaoDias < 1`, com `A retenção em dias precisa ser pelo menos 1 (recebido: N).` **antes** de criar diretório; (2) `private ?string $diretorioDaExecucao` + `continue` na poda para o diretório da execução corrente | `php artisan escola:backup --retention-days=0` → `A retenção em dias precisa ser pelo menos 1 (recebido: 0).` / `exit=1` / contagem `11 → 11` (nem criou, nem podou). Execução real com `--retention-days=1`: `Retenção: 1 removido(s), 2 ignorado(s), 0 órfão(s)`, EXIT=0, antigo removido e o do dia preservado | **Mutação da nova guarda** (`if (false && $diretorio === $this->diretorioDaExecucao)`): `test_a_poda_nunca_remove_o_backup_da_execucao_corrente` **FALHA** (`filesize(): stat failed for …/backup-2026-10-17_021414/database.sql.gz`, `Backup.php:322`) — o teste novo pega a regressão. Código restaurado → `BackupRetentionTest: 5 passed (17 assertions)`. |
| Teste de contenção de caminho passava por motivo errado (o irmão `backups-evil` tinha `manifest.json = '{}'`, então a recusa vinha da validação de formato, não da contenção) | Fixture trocado por **cópia de um backup real** (`File::copyDirectory($this->diretoriosDeBackup($caminho)[0], $irmao.'/backup-2020-01-01_000000')`), artefato válido e coerente | Sem o código de produção tocado, o teste `test_arquivo_inexistente_fora_do_diretorio_e_irmao_de_prefixo_comum_sao_recusados` → `1 passed (10 assertions)`; ao vivo, `--file=../backups-evil/backup-2020-01-01_000000` é recusado com `O caminho informado não fica dentro do diretório de backups` | **Mutação da contenção** (troca de `str_starts_with($real.DIRECTORY_SEPARATOR, $permitido)` com separador por comparação textual contra `rtrim($base, …)`): o teste **FALHA** — `Unexpected status code 0 was received.` — antes do `9913f91` essa mesma mutação **passava**. Revertido (`git checkout --`), hash do arquivo = blob do commit. |
| `BACKUP_HOST_PATH` só aparecia em comentário no `.env.production.example` | Passou a ser linha ativa `BACKUP_HOST_PATH=./backups`, com o comentário ajustado | `docker compose --env-file .env.production.example -f docker-compose.prod.yml config --format json` → os dois mounts resolvem para `…/laravel/backups` e o total continua **2** | n/a (configuração, verificada por `config`) |

## Human Verification Required

### 1. Disparo real do agendador em produção
**Test:** Subir a stack de produção (`docker compose --env-file .env.production -f docker-compose.prod.yml up -d`) e conferir, no dia seguinte, um diretório `backup-AAAA-MM-DD_0230*` no host.
**Expected:** um backup novo por dia, criado sem intervenção manual, no diretório apontado por `BACKUP_HOST_PATH`.
**Why human:** exige o horário real do agendador (02:30 America/Sao_Paulo) com os containers de produção rodando por um dia; não é observável em execução de teste.

### 2. Sobreposição do bind mount sobre o volume nomeado no host
**Test:** Criar um arquivo dentro de `storage/app/backups` no container de produção e conferir no host, em `BACKUP_HOST_PATH`.
**Expected:** o arquivo aparece no host (o bind mount vence o volume `app-storage`).
**Why human:** a precedência de mounts do Docker depende da ordenação em runtime; `docker compose config` mostra as duas montagens, mas não prova qual vence.

### 3. Restauração no ambiente de produção
**Test:** Com a imagem de produção (`Dockerfile.prod`, `APP_ENV=production`), rodar o procedimento do runbook: `php artisan down` → `escola:restore-backup --dry-run` → `escola:restore-backup --force` → `php artisan up`.
**Expected:** restauração concluída e sistema de volta ao ar com banco e uploads do backup.
**Why human:** envolve a imagem de produção e indisponibilidade planejada; o verificador executou a restauração real no container de dev (mesmos binários: `mysqldump`, `mysql`, `tar`, `gzip`, `sha256sum`).

## Gaps Summary

**No gaps found.** O goal e os 4 Success Criteria estão comprovados por execução própria, e as duas ressalvas ⚠️ da verificação anterior foram corrigidas em `9913f91` e **reconfirmadas por mutação**: (i) `--retention-days=0` agora é recusado antes de criar qualquer diretório (`11 → 11`, exit 1) e existe proteção explícita do diretório da execução corrente, que o teste novo reprova quando desativada; (ii) o teste de contenção de caminho agora falha quando o separador final é removido (antes passava). Restam apenas dois itens ℹ️ não bloqueantes: entradas de symlink não filtradas na validação do tar (o `tar` do sistema não escreve através delas) e a ausência de teste de integração do **dumper** real (o do restaurador existe e roda).

## Verification Metadata

**Abordagem:** dirija-se pelo objetivo (goal-backward), com **reverificação adversarial** das correções — cada guarda nova/alterada foi falsificada por mutação temporária de código, revertida com `git checkout --` e conferida por hash contra o blob do commit.
**Fonte dos must-haves:** frontmatter dos PLAN.md (7 verdades em 01-01 + 9 em 01-02 = 16) + Success Criteria do ROADMAP.md + BACKUP-01/02/03 do REQUIREMENTS.md, mais 1 guarda extra de contenção de caminho verificada explicitamente.
**Checagens automatizadas:** 22 executadas, 22 passaram, 0 falharam. Provas de sensibilidade por mutação: 3 induzidas — 3 confirmaram (retenção 0 recusada; proteção do diretório corrente reprova o teste; contenção de caminho reprova o teste).
**Caveat de método:** rodar dois processos de teste **em paralelo** produz falhas espúrias (`Found unexpected file or directory at path [alunos/fotos/foto.jpg]`) porque ambos compartilham o disco falso `storage/framework/testing/disks/public`; todas as evidências citadas vêm de execuções **sequenciais**.
**Checagens humanas necessárias:** 3
**Tempo total de verificação:** ~27 min somando a verificação original e as reconfirmações.

## Adendo ao relatório (pós-verificação)

O ℹ️ "comparação de caminho por string crua" (`BACKUP_PATH` com barra final anulando a proteção do backup corrente) foi corrigido em `c818bbb` — `criarDiretorio()` normaliza a barra final e a comparação na poda normaliza os dois lados. O teste `test_a_poda_protege_o_backup_corrente_mesmo_com_barra_final_no_caminho` foi adicionado e **provado discriminante por mutação**: com a normalização removida ele FALHA (o backup do dia é podado e o comando morre em `filesize()`), e com a normalização restaurada passa. Suíte completa após a correção: `60 passed, 1 skipped (274 assertions)`; `pint --test`: 94 arquivos PASS.

---
*Verificado: 2026-10-17T05:17:17Z (reverificação pós-`9913f91`; adendo pós-`c818bbb`)*
*Verificador: subagente independente*
