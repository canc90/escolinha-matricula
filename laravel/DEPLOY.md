# Implantação em produção

Guia para publicar a aplicação Laravel com `Dockerfile.prod` + `docker-compose.prod.yml`.

O ambiente de desenvolvimento (`docker-compose.yml` + `php artisan serve`) continua igual.
Produção usa uma **imagem imutável** (código e dependências embutidos), **php-fpm + nginx**,
MySQL **sem porta exposta** e serviços separados de **fila** e **agendador**.

## Arquitetura

| Serviço | Papel | Imagem |
|---|---|---|
| `app` | nginx (porta 80) + php-fpm | `escola-app:prod` |
| `queue` | processa jobs (`queue:work`) | `escola-app:prod` |
| `scheduler` | executa tarefas agendadas (`schedule:work`) | `escola-app:prod` |
| `mysql` | banco (apenas rede interna) | `mysql:8.4` |

Os três serviços de aplicação compartilham o volume `app-storage` (`storage/`), para que
uploads, sessões, cache e logs sejam os mesmos. O banco usa o volume `mysql-data`.
Exceção: `storage/app/backups` é uma **montagem do host** (`BACKUP_HOST_PATH`), fora do
volume, para que as cópias não fiquem presas dentro do Docker — veja a seção Backup.

## Passo a passo

```bash
cd laravel

# 1. Configure o ambiente
cp .env.production.example .env.production
#    - defina DB_PASSWORD e DB_ROOT_PASSWORD (senhas fortes)
#    - defina APP_URL (ex.: https://escola.exemplo.com)
#    - mantenha APP_DEBUG=false e APP_ENV=production

# 2. Gere a APP_KEY e cole o valor em APP_KEY= no .env.production
docker compose -p escola-prod --env-file .env.production -f docker-compose.prod.yml \
    run --rm app php artisan key:generate --show

# 3. Construa e suba
docker compose -p escola-prod --env-file .env.production -f docker-compose.prod.yml build
docker compose -p escola-prod --env-file .env.production -f docker-compose.prod.yml up -d
```

A aplicação responde em **http://localhost:8080** (nginx). Ajuste o mapeamento `"8080:80"`
em `docker-compose.prod.yml` conforme necessário.

Na primeira subida o entrypoint executa automaticamente: espera o banco, cria o link do
storage, roda `migrate --force`, o `package:discover` e o `optimize`
(config/rotas/views em cache).

## Dados iniciais (primeiro deploy)

```bash
# Opcional: criar o usuário administrador padrão
docker compose -p escola-prod --env-file .env.production -f docker-compose.prod.yml \
    exec app php artisan db:seed --force
```

Para importar os dados do sistema antigo (SQLite) é preciso disponibilizar o arquivo no
container e rodar o importador:

```bash
docker cp ../backend/database/database.sqlite escola-prod-app-1:/tmp/old.sqlite
docker compose -p escola-prod --env-file .env.production -f docker-compose.prod.yml \
    exec app php artisan escola:import-sqlite --source=/tmp/old.sqlite
```

## HTTPS, túnel e proxy

Se a aplicação fica atrás de um proxy reverso ou túnel (Cloudflare, etc.), a variável
`TRUSTED_PROXIES` faz o Laravel confiar nos cabeçalhos `X-Forwarded-*` (gera URLs `https` e
detecta conexões seguras):

- `TRUSTED_PROXIES=*` quando a aplicação **só** recebe tráfego do proxy;
- `TRUSTED_PROXIES=10.0.0.1,10.0.0.2` para IPs específicos.

Com HTTPS ativo, mantenha `SESSION_SECURE_COOKIE=true`. Para testes locais via
`http://localhost` use `false` (senão o cookie de sessão não é gravado e o login falha).

## O que foi endurecido

- `APP_ENV=production` e `APP_DEBUG=false` (não vaza variáveis/stack trace em erros).
- Código e dependências **embutidos na imagem**; `vendor` instalado com `--no-dev`.
- **php-fpm + nginx** (não mais `php artisan serve`) com **opcache** e JIT ligados.
- `optimize` no boot: configuração, rotas, views e eventos em cache.
- MySQL **sem porta publicada** (`3306` acessível só pela rede do compose).
- Senhas do banco via variáveis obrigatórias (`DB_PASSWORD`, `DB_ROOT_PASSWORD`).
- Cabeçalhos de segurança em todas as respostas (`SecurityHeaders`): nosniff,
  X-Frame-Options, Referrer-Policy e HSTS sob HTTPS.
- Rate limit global da API (`throttle:api`, 60/min por usuário/IP) além do limite de
  login (`6/min`).
- Expiração dos tokens da API configurável (`SANCTUM_TOKEN_EXPIRATION`, em minutos).
- Serviços com `restart: unless-stopped` e healthchecks.

## Comandos úteis

```bash
P="docker compose -p escola-prod --env-file .env.production -f docker-compose.prod.yml"

$P ps                        # status dos serviços
$P logs -f app               # logs do nginx/php-fpm e do entrypoint
$P exec app php artisan about
$P exec app php artisan migrate --force
$P exec app php artisan optimize:clear   # limpa os caches
$P restart app               # aplicar novo código após rebuild
```

## Atualização de versão

```bash
git pull
$P build
$P up -d
```

Como `opcache.validate_timestamps=0`, o código só é recarregado após recriar o container
(`up -d` já recria quando a imagem muda).

## Backup

O backup é gerado pelo comando `escola:backup`, que cria um diretório
`backup-AAAA-MM-DD_HHMMSS/` com:

| Arquivo | Conteúdo |
|---|---|
| `database.sql.gz` | dump completo do MySQL, compactado |
| `uploads.tar.gz` | fotos e documentos de `storage/app/public` |
| `manifest.json` | tamanho e sha256 de cada artefato (é o marcador de backup íntegro) |

### Onde os backups ficam

- **Em desenvolvimento**, o repositório inteiro é montado em `/var/www/html`, então
  `storage/app/backups` já aparece no host — não há nada a configurar.
- **Em produção**, o caminho é o diretório do host definido por `BACKUP_HOST_PATH`
  (`./backups` por padrão), montado em `/var/www/html/storage/app/backups` nos serviços
  `app` e `scheduler`. Recomendamos apontá-lo para um diretório **fora da árvore do projeto**:

  ```bash
  BACKUP_HOST_PATH=/srv/escola-backups docker compose -p escola-prod \
      --env-file .env.production -f docker-compose.prod.yml up -d
  ```

Sem essa montagem, o backup ficaria **preso dentro do volume `app-storage`** (um volume do
Docker, invisível para o host) e não poderia ser copiado para outro lugar — ou seja, não
seria recuperável. A variável `BACKUP_PATH` no `.env.production` precisa apontar para o
mesmo caminho de dentro do container (`/var/www/html/storage/app/backups`).

### Comandos manuais rodam como `www-data`

Use `-u www-data` em **todos** os comandos manuais de backup e restauração:

```bash
P="docker compose -p escola-prod --env-file .env.production -f docker-compose.prod.yml"

$P exec -u www-data app php artisan escola:backup
```

O serviço `app` sobe como **root** (não declara `user:`) e o `scheduler` roda como
`www-data`. Um backup executado como root cria diretórios `root:root` no volume do host,
que o `scheduler` não consegue podar nem sobrescrever: os backups passam a se acumular sem
retenção e o backup diário falha. Rodando como `www-data`, o dono é o mesmo do `scheduler`
e da `queue`.

### Rotina diária

- `escola:backup` roda **às 02:30** (America/Sao_Paulo) pelo serviço `scheduler`.
- A retenção é `BACKUP_RETENTION_DAYS` (**14 dias** por padrão) e pode ser sobrescrita em
  uma execução com `--retention-days=N`.
- A retenção é tolerante: um diretório antigo que não pode ser removido gera aviso e é
  contado como órfão, sem derrubar o backup do dia. Diretórios com nome fora do padrão (ou
  com data impossível) nunca são apagados.
- Uma falha em qualquer etapa **não** apaga o backup da própria execução quando o
  `manifest.json` já foi escrito.

### Verificação manual

```bash
$P exec -u www-data app php artisan escola:backup

# Confira o diretório mais recente
$P exec -u www-data app sh -c 'cd storage/app/backups && ls -1 | tail -1'
$P exec -u www-data app sh -c 'd=$(ls -1d storage/app/backups/backup-* | tail -1); \
    gzip -t "$d/database.sql.gz" && tar -tzf "$d/uploads.tar.gz" >/dev/null && \
    sha256sum "$d/database.sql.gz" "$d/uploads.tar.gz" && cat "$d/manifest.json"'
```

### Restauração

A restauração **sobrescreve** o banco e os uploads. Em produção `--force` é obrigatório, e
o comando sem argumentos usa o backup mais recente.

```bash
# 1. Coloque a aplicação em manutenção
$P exec -u www-data app php artisan down

# 2. Valide o backup SEM escrever nada (mostra o plano e compara ambiente/banco)
$P exec -u www-data app php artisan escola:restore-backup --dry-run

# 3. Restaure (o backup mais recente, ou aponte outro com --file=<diretório>)
$P exec -u www-data app php artisan escola:restore-backup --force
# $P exec -u www-data app php artisan escola:restore-backup --force --file=backup-2026-10-01_023000

# 4. Suba de novo
$P exec -u www-data app php artisan up
```

Confirme depois que o login funciona, que existe aluno/professora no sistema e que as fotos
aparecem nas telas.

O comando **recusa** restaurar quando o `ambiente` ou o `banco` gravado no manifesto é
diferente do destino — restaurar um dump de homologação em produção é exatamente o acidente
que essa guarda evita. `--force` confirma a exceção de forma explícita. Ele também recusa
backup sem `manifest.json`, com sha256 divergente, com formato de manifesto desconhecido ou
com arquivos de uploads contendo caminhos suspeitos.

**Uploads são restaurados de forma aditiva**: o `tar` sobrescreve os arquivos que existem no
backup, mas **não remove** do disco `public` os arquivos criados depois dele. Quando isso
importar (foto ou documento corrompido, ou arquivo que não deveria estar lá), confira com
`--dry-run`, limpe ou mova manualmente o conteúdo de `storage/app/public` antes de restaurar
e tenha em mente que não existe remoção automática — é a opção segura por padrão, porque
apagar por engano não tem volta.

Depois de uma restauração, o cache e os locks são limpos automaticamente (o dump traz o
estado do momento em que foi gerado, inclusive o lock do próprio backup).

### Dados sensíveis

Dumps e arquivos de uploads contêm dados pessoais de alunos e professoras. Restrinja a
permissão do diretório de backup e **não** versione esses arquivos (o projeto já ignora
`storage/app/backups` e `backups/`).

### O que ainda não existe

A cópia **off-site** (BACKUP-04, para um release futuro). Hoje o backup protege contra falha
da aplicação e corrupção de dados, mas não contra a perda do servidor: enquanto não houver
cópia externa, replique o diretório de backup para outro lugar periodicamente.

## Observabilidade

### Logs da aplicação

**Onde ficam.** `storage/logs/laravel-AAAA-MM-DD.log` — um arquivo por dia — dentro do volume
nomeado `app-storage`, montado em `/var/www/html/storage` nos serviços `app`, `queue` e
`scheduler`: os três escrevem no **mesmo** diretório de logs. Por estarem dentro do volume, os
logs **não aparecem no host** (diferente do backup, que é bind mount) e **não entram no backup**
(fase 1, que cobre apenas banco e uploads). Se for preciso preservar logs antes de remover o
volume, copie-os manualmente.

**Rotação e retenção.** Os arquivos além de `LOG_DAILY_DAYS` dias (**14** por padrão) são
removidos automaticamente. `LOG_DAILY_DAYS=0` **não** desliga a retenção — cai no padrão de 14
(`max_files=0` no Monolog significaria "sem limite"). O valor é lido pela aplicação no boot:
para mudar, altere o `.env.production` e recrie o container (`$P up -d`); com config em cache,
rode antes `$P exec app php artisan optimize:clear`.

**`LOG_LEVEL`.** Em produção mantenha `warning` (menos ruído e menos disco); `debug` só para
investigar, voltando a `warning` depois.

**Canal de alertas.** Existe também `storage/logs/alertas-AAAA-MM-DD.log`, com o nível **fixo**
em `warning` (independente de `LOG_LEVEL`, para o alerta nunca ser engolido por um nível global
mais alto) e a mesma retenção de `LOG_DAILY_DAYS`. Nele é gravado o fallback do alerta de erro
5xx — detalhado na subseção seguinte.

**Como ler** (o fuso do shell do container é UTC e o do app é `America/Sao_Paulo`; por isso os
comandos leem o arquivo datado mais recente em vez de montar a data pelo shell, que divergiria
do app entre 00:00 e 03:00 UTC):

```sh
P="docker compose -p escola-prod --env-file .env.production -f docker-compose.prod.yml"

# Em produção (mesmo usuário dos comandos manuais de backup):
$P exec -u www-data app sh -c 'ls -1 storage/logs; tail -n 200 "$(ls -1t storage/logs/laravel-*.log | head -1)"'

# Em dev:
docker compose exec app sh -c 'tail -n 200 "$(ls -1t storage/logs/laravel-*.log | head -1)"'
```

**Como conferir o disco** (a contagem deve ficar em torno de `LOG_DAILY_DAYS` por canal, mais o
arquivo de deprecations, se algum dia for substituído o canal `null`):

```sh
$P exec -u www-data app du -sh storage/logs
$P exec -u www-data app sh -c 'ls -1 storage/logs | wc -l'
```

**Como limpar manualmente** (apagar log apaga evidência: só depois de investigar):

```sh
$P exec -u www-data app sh -c 'rm -f storage/logs/laravel-*.log storage/logs/alertas-*.log'
```

**Dados sensíveis.** Mensagens de erro podem conter dados de alunos e professoras. A retenção
de 14 dias limita a janela de exposição, os arquivos não são versionados (`*.log` no
`.gitignore`) e o diretório não é servido pelo servidor web.

### Alertas de erro 5xx

Todo erro **5xx** (500, 502, 503...) dispara a notificação do `NotificadorDeErros`, capturada
pelo **status final** da resposta — por isso um `abort(503)` também alerta, e 404/401/403/419
e erro de validação (422) **não** disparam nada. O alerta é um POST JSON com status, classe,
mensagem, arquivo/linha, método, rota e timestamp (sem headers, query string nem stack trace:
o objetivo é avisar, não vazar dados).

**Canal.** Configure `ALERT_WEBHOOK_URL` no `.env.production` com um webhook de n8n, Slack,
Discord etc. Trocar o canal é trocar o `.env` e recriar o container (`$P up -d`) — **nenhuma
edição de código**. Para conferir: `$P exec app php artisan config:show escola` (bloco
`alertas`). A URL é lida no boot; com config em cache, rode `optimize:clear` antes.

**Comportamento.**

- **Sem URL configurada** (estado legítimo): o alerta é registrado no canal de log `alertas`
  (`storage/logs/alertas-*.log`) — nada fica em silêncio.
- **Webhook fora do ar ou devolvendo erro**: a falha é registrada no mesmo canal (apenas
  esquema/host/porta, nunca a URL completa, que pode conter token) e **a requisição do usuário
  segue respondendo normalmente** — a entrega do alerta nunca pode quebrar o pipeline.
- **Deduplicação**: o MESMO erro (status + classe + rota) alerta **uma vez** dentro de
  `ALERT_DEDUP_MINUTES` (10 min por padrão); a repetição aparece como breadcrumb `warning` no
  log padrão (`suprimido por deduplicacao`).
- **Teto global**: no máximo `ALERT_MAX_PER_HOUR` (30 por padrão) alertas distintos por hora;
  o excedente vai para o canal `alertas` em vez de virar enxurrada no webhook.
- **Timeouts**: `ALERT_WEBHOOK_TIMEOUT` (5 s) e `ALERT_WEBHOOK_CONNECT_TIMEOUT` (2 s) impedem
  que um webhook sem resposta prenda o worker do `app`, `queue` ou `scheduler`.

**Como testar manualmente** (dispara um erro de verdade e observa a saída):

```sh
# Receptor local (dev): um endpoint que grava o POST e responde 200
docker compose exec app sh -c 'printf "%s\n" "<?php file_put_contents(\"/tmp/recebido.json\", file_get_contents(\"php://input\")); http_response_code(200);" > /tmp/recv.php; php -S 127.0.0.1:9977 /tmp/recv.php &'
export ALERT_WEBHOOK_URL=http://127.0.0.1:9977/eco
docker compose exec app php artisan config:show escola   # o canal precisa refletir o .env
# A seguir, provoque um 5xx (ou aguarde um erro real) e confira:
docker compose exec app sh -c 'head -c 600 /tmp/recebido.json'
```

```sh
# Em produção, sem receptor: o webhook está fora do ar? confira o fallback
$P exec -u www-data app sh -c 'tail -n 50 storage/logs/alertas-*.log'
```

**Dados sensíveis.** O payload NÃO inclui headers, corpo/query da requisição nem stack trace
— contém apenas status, classe, mensagem (truncada), arquivo/linha, rota e timestamp.

## Limitações conhecidas

- Sem Content-Security-Policy: a interface usa CDNs e estilos/scripts inline; uma CSP
  restritiva exigiria refatorar a interface.
- Sessões, cache e fila usam o banco (`database`). Para maior volume, migre para Redis.
- Um único host. Para escalar horizontalmente, mova `storage` para object storage (S3) e
  a sessão/cache para Redis.
