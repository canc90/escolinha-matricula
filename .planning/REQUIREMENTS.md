# Requirements: Sistema de Gestão Escolar — Escolinha Girassol

**Defined:** 2026-10-16
**Core Value:** A escola consegue manter os dados de alunos, turmas e frequência atualizados e confiáveis, com relatórios prontos para o dia a dia — sem depender de planilhas.

## v1 Requirements

Requisitos do release inicial. Cada um mapeia para uma fase do roadmap.

### Confiabilidade de Dados

- [ ] **BACKUP-01**: O sistema executa backup diário automático do banco MySQL, gravando um dump compactado com retenção configurável
- [ ] **BACKUP-02**: O backup diário inclui os arquivos enviados (fotos de alunos, documentos e fotos de professoras)
- [ ] **BACKUP-03**: A restauração de um backup é documentada e coberta por teste automatizado

### Observabilidade

- [ ] **OBS-01**: Os logs da aplicação rotacionam diariamente com retenção definida, sem crescimento indefinido de disco
- [ ] **OBS-02**: Erros 5xx disparam notificação para um canal configurável

### Segurança

- [ ] **SEC-01**: As respostas incluem Content-Security-Policy restritiva, com os assets servidos pela própria aplicação e nonce/hash para scripts inline

### Qualidade

- [ ] **QUAL-01**: Análise estática (larastan/phpstan) configurada para o código Laravel, sem erros no nível adotado
- [ ] **QUAL-02**: O CI executa a análise estática e falha o build quando ela falha

### Higiene do Repositório

- [ ] **LEGACY-01**: O sistema legado Node/Express (`backend/`, `frontend/`) é arquivado ou removido, preservando a origem dos dados usados na importação
- [ ] **LEGACY-02**: O CI deixa de executar os testes do legado após o arquivamento

## v2 Requirements

Adiados para um release futuro. Registrados, mas fora do roadmap atual.

### Confiabilidade de Dados

- **BACKUP-04**: Cópia off-site dos backups (fora da máquina que hospeda o sistema)

### Higiene do Repositório

- **LEGACY-03**: Remoção definitiva dos dados e artefatos legados do repositório, após período de segurança

## Out of Scope

Explicitamente excluídos. Documentados para evitar aumento de escopo.

| Feature | Motivo |
|---------|--------|
| App mobile nativo | A interface web responsiva (Bootstrap) atende |
| Multi-escola (multi-tenant) | Hoje é uma única escola |
| Reescrever o frontend como SPA | Livewire resolve com menos complexidade |

## Traceability

Quais fases cobrem quais requisitos. Preenchido durante a criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BACKUP-01 | Phase 1 | Pending |
| BACKUP-02 | Phase 1 | Pending |
| BACKUP-03 | Phase 1 | Pending |
| OBS-01 | Phase 2 | Pending |
| OBS-02 | Phase 2 | Pending |
| SEC-01 | Phase 3 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 4 | Pending |
| LEGACY-01 | Phase 5 | Pending |
| LEGACY-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10 ✓
- Unmapped: 0

---

*Requirements defined: 2026-10-16*
*Last updated: 2026-10-16 after roadmap creation (traceability filled)*
