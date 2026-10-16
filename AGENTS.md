<!-- GSD:project-start source:PROJECT.md -->

## Project

**Sistema de Gestão Escolar — Escolinha Girassol**

Sistema de gestão escolar usado por uma escola de educação infantil: cadastro de
alunos e professoras, turmas, diário de classe, frequências, relatórios (PDF/CSV),
alertas de risco e indicadores (BI). A versão em uso é a **Laravel + Livewire**
(PHP 8.4, MySQL 8, Bootstrap 5.3), resultado da migração da versão original em
Node/Express + SQLite, mantida apenas para importação de dados e referência.

**Core Value:** A escola consegue manter os dados de alunos, turmas e frequência atualizados e
confiáveis, com relatórios prontos para o dia a dia — **sem depender de planilhas**.

### Constraints

- **Tech stack**: Laravel 13 + Livewire 4 + MySQL 8 + Bootstrap 5.3 — mudanças devem
  seguir a stack existente.

- **Interface**: usa CDNs (Bootstrap, Chart.js) e estilos/scripts inline — restringe CSP.
- **Idioma**: toda comunicação e UI em português do Brasil.
- **Segurança**: operações administrativas exigem `role:admin`; cabeçalhos de segurança
  e rate limiting são globais.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
