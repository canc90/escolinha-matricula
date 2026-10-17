# Roadmap: Sistema de Gestão Escolar — Escolinha Girassol

## Overview

O sistema já está em uso (Laravel 12 + Livewire + MySQL) e cobre cadastro de alunos,
professoras e turmas, diário de classe, frequências, importações, relatórios, BI e IA
educacional. Este milestone fecha as lacunas operacionais que sobraram da migração do
sistema legado: garantir que os dados sobrevivam a falhas (backup e restauração provada),
dar visibilidade ao que acontece em produção (logs com retenção e alerta de erro),
endurecer o front (CSP com assets servidos pela própria aplicação), barrar regressões com
análise estática no CI e retirar de cena o Node/Express — deixando no repositório apenas o
sistema que a escola usa de fato.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Backup e Restauração de Dados** - Backups diários do banco e dos uploads, com restauração provada
- [ ] **Phase 2: Observabilidade Operacional** - Logs rotacionados e alerta automático em erros 5xx
- [ ] **Phase 3: Endurecimento de Segurança (CSP)** - Assets self-hosted e Content-Security-Policy restritiva
- [ ] **Phase 4: Qualidade Automatizada com Análise Estática** - larastan/phpstan como gate no CI
- [ ] **Phase 5: Higiene do Repositório (Retirada do Legado)** - Node/Express arquivado, CI sem Jest

## Phase Details

### Phase 1: Backup e Restauração de Dados
**Goal**: Os dados da escola sobrevivem a falhas: banco e uploads são copiados automaticamente todos os dias e a restauração foi executada com sucesso pelo menos uma vez
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: BACKUP-01, BACKUP-02, BACKUP-03
**Success Criteria** (what must be TRUE):
  1. Um backup compactado do banco MySQL é gerado automaticamente a cada dia, sem intervenção manual
  2. Os arquivos enviados (fotos de alunos, documentos e fotos de professoras) também estão no backup diário
  3. Backups mais antigos que a retenção configurada são descartados, mantendo o disco sob controle
  4. Um backup pode ser restaurado (banco e uploads) seguindo a documentação, e essa restauração é verificada por teste automatizado
**Plans**: 2 plans

Plans:
- [x] 01-01: Comando `escola:backup` — dump compactado, uploads, retenção, agendamento diário e destino recuperável
- [x] 01-02: Comando `escola:restore-backup` — guardas de segurança, suíte de testes e runbook em DEPLOY.md

### Phase 2: Observabilidade Operacional
**Goal**: Quem opera o sistema enxerga o que está acontecendo: o disco não enche de log e uma falha em produção chega ao responsável sem depender de alguém abrir o servidor
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: OBS-01, OBS-02
**Success Criteria** (what must be TRUE):
  1. Os logs da aplicação rotacionam diariamente e os arquivos além da retenção definida são removidos
  2. O espaço em disco ocupado por logs permanece estável ao longo dos dias
  3. Um erro 5xx dispara notificação para um canal configurável (sem edição de código para trocar o canal)
  4. Falha ao entregar a notificação não derruba a requisição do usuário nem gera erro em cascata
**Plans**: 2 plans

Plans:
- [x] 02-01: Logs com rotação diária e retenção de 14 dias (com poda real provada)
- [x] 02-02: Alerta de 5xx por webhook (`ALERT_WEBHOOK_URL`) com fallback no canal `alertas`, deduplicação e teto

### Phase 3: Endurecimento de Segurança (CSP)
**Goal**: As páginas entregues ao navegador não carregam nem executam nada que não venha da própria aplicação, sem perder nenhuma funcionalidade existente
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SEC-01
**Success Criteria** (what must be TRUE):
  1. Bootstrap, ícones e Chart.js são servidos pela própria aplicação — login, diário, painéis e relatórios não fazem nenhuma requisição a CDN externa
  2. Toda resposta HTML inclui o cabeçalho `Content-Security-Policy` com `default-src 'self'` (e sem `unsafe-inline` para scripts)
  3. Scripts e estilos inline legítimos (Livewire, Chart.js) continuam funcionando via nonce ou hash
  4. O console do navegador não registra violações de CSP nos fluxos principais (login, aluno, frequência, painel)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Qualidade Automatizada com Análise Estática
**Goal**: Erros de tipo, código morto e chamadas erradas são barradas antes de chegar à branch principal
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. A análise estática (larastan/phpstan) roda localmente sobre o código Laravel sem erros no nível adotado
  2. O CI falha o build quando a análise estática reporta erro, e o motivo aparece no log do job
  3. O pipeline completo (Pint + Pest + análise estática) fica verde na `main`
  4. Introduzir deliberadamente um erro de tipo faz o CI falhar (o gate existe de fato, não é decorativo)
**Plans**: TBD

### Phase 5: Higiene do Repositório (Retirada do Legado)
**Goal**: O repositório contém apenas o sistema em uso, sem perder o acesso à origem dos dados que já foram importados
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: LEGACY-01, LEGACY-02
**Success Criteria** (what must be TRUE):
  1. `backend/` e `frontend/` saem do fluxo principal (arquivados fora do caminho de build) e não há mais código Node ativo no projeto
  2. A origem dos dados importados (banco SQLite e uploads antigos) continua preservada e acessível
  3. O CI não executa mais os testes Jest do legado e permanece verde com Laravel + Pint + análise estática
  4. A documentação do projeto (CLAUDE.md, README, DEPLOY) não descreve mais o legado como parte do sistema
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backup e Restauração de Dados | 2/2 | Complete | 2026-10-17 |
| 2. Observabilidade Operacional | 0/TBD | Not started | - |
| 3. Endurecimento de Segurança (CSP) | 0/TBD | Not started | - |
| 4. Qualidade Automatizada com Análise Estática | 0/TBD | Not started | - |
| 5. Higiene do Repositório (Retirada do Legado) | 0/TBD | Not started | - |
