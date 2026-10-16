# Sistema de Gestão Escolar — Escolinha Girassol

## What This Is

Sistema de gestão escolar usado por uma escola de educação infantil: cadastro de
alunos e professoras, turmas, diário de classe, frequências, relatórios (PDF/CSV),
alertas de risco e indicadores (BI). A versão em uso é a **Laravel + Livewire**
(PHP 8.4, MySQL 8, Bootstrap 5.3), resultado da migração da versão original em
Node/Express + SQLite, mantida apenas para importação de dados e referência.

## Core Value

A escola consegue manter os dados de alunos, turmas e frequência atualizados e
confiáveis, com relatórios prontos para o dia a dia — **sem depender de planilhas**.

## Requirements

### Validated

- Login com autenticação de sessão (web) e API REST com Sanctum (`/api/v1`).
- CRUD de alunos (com foto/documento e soft delete), professoras e turmas.
- Vínculo professora↔turma (N:N).
- Diário de classe e registro de frequências.
- Relatórios em PDF (ficha do aluno, frequência da turma) e CSV.
- Painéis: geral, professora e pedagógico (indicadores/BI).
- Alertas automáticos de frequência (`RiskEngine`, agendado diariamente).
- Auditoria de operações (`AuditLog`) e importação do banco legado (SQLite → MySQL).
- Cabeçalhos de segurança e rate limiting (login e API).

### Active

- [ ] Backups automatizados do banco (volume MySQL) e dos uploads, com restauração testada.
- [ ] Observabilidade: rotação/centralização de logs e alertas de erro 5xx.
- [ ] Content-Security-Policy (self-host dos assets + nonce/hash).
- [ ] Análise estática (larastan/phpstan) no CI.
- [ ] Arquivar/remover o sistema legado Node/Express (`backend/`, `frontend/`) do fluxo principal.

### Out of Scope

- App mobile nativo — a interface web responsiva (Bootstrap) atende.
- Multi-escola (multi-tenant) — hoje é uma única escola.
- Reescrever o frontend em framework SPA — Livewire já resolve com menos complexidade.

## Context

- **Ambiente**: Docker Compose. Dev com `php artisan serve` (porta 8000) + MySQL;
  produção com imagem imutável (php-fpm + nginx), fila e agendador dedicados.
- **Domínio**: educação infantil; muitos registros com foto de aluno e documentos.
- **Migração**: o sistema antigo (Node/Express, SQLite) **não** está mais em uso, mas
  seus dados alimentam o banco atual via `escola:import-sqlite`.
- **Testes**: 38 testes (Laravel/Pest) e 115 (legado/Jest), ambos verdes.
- **Padrão de telas**: componentes Livewire (`app/Livewire/...`) + views
  (`resources/views/livewire/...`), layout `layouts::app`.
- **Idioma/timezone**: pt_BR / America/Sao_Paulo.

## Constraints

- **Tech stack**: Laravel 13 + Livewire 4 + MySQL 8 + Bootstrap 5.3 — mudanças devem
  seguir a stack existente.
- **Interface**: usa CDNs (Bootstrap, Chart.js) e estilos/scripts inline — restringe CSP.
- **Idioma**: toda comunicação e UI em português do Brasil.
- **Segurança**: operações administrativas exigem `role:admin`; cabeçalhos de segurança
  e rate limiting são globais.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Migrar de Node/Express para Laravel + Livewire | Manutenção, ecossistema e produtividade | ✓ Good |
| Manter o legado no repositório | Importação de dados e referência de regras | ⚠️ Revisit (arquivar) |
| MySQL em vez de SQLite | Concorrência e produção | ✓ Good |
| Sanctum para a API REST | Integração com token sem complexidade de OAuth | ✓ Good |
| Isolar banco de teste do banco versionado | Impedir que testes poluam dados reais | ✓ Good |
| Adicionar CI (Node + Laravel + Pint) | Pegar regressões cedo | ✓ Good |

---
*Last updated: 2026-10-16 após a auditoria de produção e ajustes de qualidade.*
