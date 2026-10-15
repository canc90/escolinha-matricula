# Sistema de Gestão Escolar — Laravel

Aplicação Laravel 13 (PHP 8.4) + Livewire 4 + MySQL 8 + Bootstrap 5.3, migrada do sistema
original em Node/Express. Roda em Docker (PHP-FPM/CLI + MySQL), sem depender de PHP instalado no host.

## Requisitos

- Docker + Docker Compose v2

## Subir o ambiente

```bash
cd laravel
docker compose up -d --build      # sobe app (php artisan serve) e MySQL
docker compose exec app php artisan migrate --force
docker compose exec app php artisan db:seed --force
```

A aplicação fica em: **http://localhost:8000**

Usuário inicial (se não houver dados importados): `admin` / `admin123`.

## Importar dados do sistema antigo (SQLite)

O `docker-compose.yml` monta `../backend/database` (somente leitura) em `/old-db`.

```bash
docker compose exec app php artisan migrate:fresh --force
docker compose exec app php artisan escola:import-sqlite
docker compose exec app php artisan db:seed --force
```

Tabelas importadas: professoras, turmas, usuários, turma_professora, alunos, diario_classe,
frequencias, logs, audit_logs, bi_snapshots, report_cache, alerts.

## Comandos úteis

```bash
docker compose exec app php artisan test        # testes (Pest/PHPUnit)
docker compose exec app php artisan route:list
docker compose exec app php artisan schedule:run  # agendador (alertas)
docker compose logs -f app
```

## Testar a API

A API é versionada em `/api/v1` e autenticada por token (Sanctum). Há uma página de
diagnóstico em **/api-tester** (menu *Testar API*, apenas administradores) que dispara as
chamadas reais pelo navegador e exibe o status e o JSON — sem precisar de curl/console.

Fluxo manual, se preferir:

```bash
# 1. Login (retorna o token)
curl -X POST http://localhost:8000/api/v1/login \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"usuario":"admin","senha":"admin123","device_name":"cli"}'

# 2. Rota protegida
curl http://localhost:8000/api/v1/me \
  -H 'Accept: application/json' -H "Authorization: Bearer <TOKEN>"
```

## Produção

O ambiente de produção é separado do desenvolvimento e usa uma imagem imutável
(php-fpm + nginx), MySQL sem porta exposta e serviços de fila/agendador. Veja
**[DEPLOY.md](DEPLOY.md)**.

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Estrutura

- `app/Livewire` — componentes (Auth, Alunos, Professoras, Turmas, Diário, Frequências, Direção, IA, Importação, Users, ApiTester)
- `app/Models` — Eloquent (Aluno, Professora, Turma, DiarioClasse, Frequencia, Log, AuditLog, BiSnapshot, ReportCache, Alert, User)
- `app/Services/RiskEngine.php` — motor de risco/alertas da IA educacional
- `app/Services/AiEducacional.php` — recomendação via Gemini (HTTP Client) com fallback local
- `app/Support/Audit.php` — registro de auditoria
- `app/Http/Controllers/Api` — API v1 (Auth, Aluno, Professora, Turma, Alert, Dashboard)
- `app/Http/Middleware/SecurityHeaders.php` — cabeçalhos de segurança
- `resources/views/layouts` — layouts (`app`, `guest`) com Bootstrap/Chart.js
- `resources/views/livewire/api-tester.blade.php` — página "Testar API"
- `database/migrations` — schema (mesmo modelo de dados do sistema antigo)
- `app/Console/Commands/ImportSqlite.php` — importador de dados
- `app/Console/Commands/ImportUploads.php` — importador de fotos/documentos antigos
- `Dockerfile.prod` / `docker-compose.prod.yml` / `DEPLOY.md` — implantação em produção

## Observações

- Autenticação por sessão (guard `web`) para as telas + Sanctum (token) para `/api`.
- Papéis `admin` e `professora` (spatie/laravel-permission). Rotas administrativas protegidas por `role:admin`.
- Login com limite de tentativas (5/min) e API com limite global (`throttle:api`, 60/min).
- Cabeçalhos de segurança em todas as respostas e expiração de token configurável
  (`SANCTUM_TOKEN_EXPIRATION`).
- Testes: `docker compose exec app php artisan test`.
- O sistema Node original permanece intacto na raiz do repositório.
