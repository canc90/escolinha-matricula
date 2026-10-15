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

## Estrutura

- `app/Livewire` — componentes (Auth, Alunos, Professoras, Turmas, Diário, Frequências, Direção, IA, Importação, Users)
- `app/Models` — Eloquent (Aluno, Professora, Turma, DiarioClasse, Frequencia, Log, AuditLog, BiSnapshot, ReportCache, Alert, User)
- `app/Services/RiskEngine.php` — motor de risco/alertas da IA educacional
- `app/Support/Audit.php` — registro de auditoria
- `resources/views/layouts` — layouts (`app`, `guest`) com Bootstrap/Chart.js
- `database/migrations` — schema (mesmo modelo de dados do sistema antigo)
- `app/Console/Commands/ImportSqlite.php` — importador de dados

## Observações

- Autenticação por sessão (guard `web`) para as telas + Sanctum disponível para `/api`.
- Papéis `admin` e `professora` (spatie/laravel-permission). Rotas administrativas protegidas por `role:admin`.
- O sistema Node original permanece intacto na raiz do repositório.
