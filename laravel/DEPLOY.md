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

- **Banco**: `docker compose ... exec mysql mysqldump -u root -p"$DB_ROOT_PASSWORD" escola > backup.sql`
- **Uploads/anexos**: volume `app-storage` (conteúdo em `storage/app/public`).

## Limitações conhecidas

- Sem Content-Security-Policy: a interface usa CDNs e estilos/scripts inline; uma CSP
  restritiva exigiria refatorar a interface.
- Sessões, cache e fila usam o banco (`database`). Para maior volume, migre para Redis.
- Um único host. Para escalar horizontalmente, mova `storage` para object storage (S3) e
  a sessão/cache para Redis.
