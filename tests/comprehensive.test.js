const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const request = require('supertest');
const app = require('../backend/server');
const db = require('../backend/database/connection');

let adminToken;
let server;
let createdAlunoId;
let createdProfessoraId;
let createdTurmaId;
let createdDiarioId;
let createdUserId;

async function login(usuario = 'admin', senha = 'admin123') {
  const res = await request(app)
    .post('/api/login')
    .send({ usuario, senha });
  return res.body.token;
}

function authed(req) {
  return req.set('Authorization', `Bearer ${adminToken}`);
}

beforeAll(async () => {
  server = app.listen(0);
  await db('usuarios').where({ usuario: 'admin' }).update({ token_version: 0 });
  adminToken = await login();
});

afterAll(() => {
  server?.close();
});

// ============================================================
// 1. AUTENTICAÇÃO
// ============================================================
describe('1. Autenticação', () => {
  test('POST /api/login com credenciais válidas', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ usuario: 'admin', senha: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  test('POST /api/login com credenciais inválidas retorna 401', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ usuario: 'admin', senha: 'errada' });
    expect(res.status).toBe(401);
  });

  test('POST /api/login sem dados retorna 400', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/auth/refresh retorna novo token', async () => {
    const res = await authed(request(app).post('/api/auth/refresh'));
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    adminToken = res.body.token;
  });

  test('Acesso sem token retorna 401', async () => {
    const res = await request(app).get('/api/alunos');
    expect(res.status).toBe(401);
  });

  test('Acesso com token inválido retorna 403', async () => {
    const res = await request(app)
      .get('/api/alunos')
      .set('Authorization', 'Bearer token_invalido');
    expect(res.status).toBe(403);
  });
});

// ============================================================
// 2. GESTÃO DE TURMAS
// ============================================================
describe('2. Gestão de Turmas', () => {
  test('GET /api/turmas retorna lista de turmas', async () => {
    const res = await authed(request(app).get('/api/turmas'));
    expect(res.status).toBe(200);
    expect(res.body.turmas).toBeDefined();
    expect(Array.isArray(res.body.turmas)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  test('POST /api/turmas cria nova turma', async () => {
    const res = await authed(request(app).post('/api/turmas').send({
      nome: 'Turma Teste 2026',
      turno: 'matutino',
      ano_letivo: '2026',
    }));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nome).toBe('Turma Teste 2026');
    createdTurmaId = res.body.id;
  });

  test('GET /api/turmas/:id retorna turma específica', async () => {
    const res = await authed(request(app).get(`/api/turmas/${createdTurmaId}`));
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Turma Teste 2026');
  });

  test('PUT /api/turmas/:id atualiza turma', async () => {
    const res = await authed(request(app)
      .put(`/api/turmas/${createdTurmaId}`)
      .send({ nome: 'Turma Teste Atualizada' }));
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Turma Teste Atualizada');
  });

  test('POST /api/turmas/:id/professoras vincula professora', async () => {
    const res = await authed(request(app)
      .post(`/api/turmas/${createdTurmaId}/professoras`)
      .send({ professora_id: createdProfessoraId || 1, principal: true }));
    expect(res.status).toBe(201);
  });

  test('GET /api/turmas/:id/professoras lista vinculadas', async () => {
    const res = await authed(request(app).get(`/api/turmas/${createdTurmaId}/professoras`));
    expect(res.status).toBe(200);
    expect(res.body.professoras).toBeDefined();
  });
});

// ============================================================
// 3. GESTÃO DE PROFESSORAS
// ============================================================
describe('3. Gestão de Professoras', () => {
  test('GET /api/professoras retorna lista', async () => {
    const res = await authed(request(app).get('/api/professoras'));
    expect(res.status).toBe(200);
    expect(res.body.professoras).toBeDefined();
    expect(Array.isArray(res.body.professoras)).toBe(true);
  });

  test('POST /api/professoras cria nova professora', async () => {
    const res = await authed(request(app).post('/api/professoras').send({
      nome: 'Professora Teste',
      email: 'prof.teste@email.com',
      telefone: '11999999999',
      especialidade: 'Pedagogia',
    }));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nome).toBe('Professora Teste');
    createdProfessoraId = res.body.id;
  });

  test('POST /api/professoras sem nome retorna 400', async () => {
    const res = await authed(request(app).post('/api/professoras').send({
      email: 'test@email.com',
    }));
    expect(res.status).toBe(400);
  });

  test('GET /api/professoras/:id retorna professora', async () => {
    const res = await authed(request(app).get(`/api/professoras/${createdProfessoraId}`));
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Professora Teste');
  });

  test('PUT /api/professoras/:id atualiza professora', async () => {
    const res = await authed(request(app)
      .put(`/api/professoras/${createdProfessoraId}`)
      .send({ telefone: '11888888888' }));
    expect(res.status).toBe(200);
    expect(res.body.telefone).toBe('11888888888');
  });

  test('POST /api/professoras/:id/criar-login cria login para professora', async () => {
    const res = await authed(request(app)
      .post(`/api/professoras/${createdProfessoraId}/criar-login`)
      .send({ usuario: `prof_test_${Date.now()}`, senha: '1234' }));
    expect(res.status).toBe(201);
    expect(res.body.usuario).toBeDefined();
    expect(res.body.role).toBe('professora');
  });

  test('POST /api/professoras/:id/criar-login duplicado retorna 400', async () => {
    const res = await authed(request(app)
      .post(`/api/professoras/${createdProfessoraId}/criar-login`)
      .send({ usuario: `prof_dup_${Date.now()}`, senha: '1234' }));
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 4. GESTÃO DE ALUNOS
// ============================================================
describe('4. Gestão de Alunos', () => {
  test('GET /api/alunos retorna lista paginada', async () => {
    const res = await authed(request(app).get('/api/alunos'));
    expect(res.status).toBe(200);
    expect(res.body.alunos).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBeDefined();
    expect(res.body.totalPages).toBeDefined();
  });

  test('GET /api/alunos com filtro por turma', async () => {
    const res = await authed(request(app).get('/api/alunos?turma_id=5'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alunos)).toBe(true);
  });

  test('GET /api/alunos com busca', async () => {
    const res = await authed(request(app).get('/api/alunos?search=aluno'));
    expect(res.status).toBe(200);
    expect(res.body.alunos).toBeDefined();
  });

  test('GET /api/alunos com paginação', async () => {
    const res = await authed(request(app).get('/api/alunos?page=1&limit=5'));
    expect(res.status).toBe(200);
    expect(res.body.alunos.length).toBeLessThanOrEqual(5);
  });

  test('POST /api/alunos cria novo aluno', async () => {
    const res = await authed(request(app).post('/api/alunos').send({
      nome: 'Aluno Teste Completo',
      data_nascimento: '2020-03-15',
      genero: 'masculino',
      turma_id: 5,
      turma: 'Maternal I',
      turno: 'matutino',
      nome_mae: 'Mãe Teste',
      contato_mae: '11999999999',
    }));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.nome).toBe('Aluno Teste Completo');
    createdAlunoId = res.body.id;
  });

  test('POST /api/alunos com email inválido retorna 400', async () => {
    const res = await authed(request(app).post('/api/alunos').send({
      nome: 'Aluno Email Ruim',
      email_aluno: 'email_invalido',
    }));
    expect(res.status).toBe(400);
  });

  test('POST /api/alunos com data inválida retorna 400', async () => {
    const res = await authed(request(app).post('/api/alunos').send({
      nome: 'Aluno Data Ruim',
      data_nascimento: '15-03-2020',
    }));
    expect(res.status).toBe(400);
  });

  test('GET /api/alunos/:id retorna aluno específico', async () => {
    const res = await authed(request(app).get(`/api/alunos/${createdAlunoId}`));
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Aluno Teste Completo');
  });

  test('PUT /api/alunos/:id atualiza aluno', async () => {
    const res = await authed(request(app)
      .put(`/api/alunos/${createdAlunoId}`)
      .send({ nome: 'Aluno Atualizado', observacoes_aniversario_escola: 'Aniversário em março' }));
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Aluno Atualizado');
  });

  test('DELETE /api/alunos/:id remove aluno (soft delete)', async () => {
    const res = await authed(request(app).delete(`/api/alunos/${createdAlunoId}`));
    expect(res.status).toBe(200);
    const getRes = await authed(request(app).get(`/api/alunos/${createdAlunoId}`));
    expect(getRes.status).toBe(404);
  });
});

// ============================================================
// 5. DIÁRIO DE CLASSE
// ============================================================
describe('5. Diário de Classe', () => {
  test('POST /api/diario cria registro', async () => {
    const res = await authed(request(app).post('/api/diario').send({
      turma_id: 5,
      data: '2026-06-20',
      conteudo_aula: 'Conteúdo de teste - Matemática',
      observacoes: 'Observação de teste',
    }));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    createdDiarioId = res.body.id;
  });

  test('POST /api/diario sem turma_id retorna erro', async () => {
    const res = await authed(request(app).post('/api/diario').send({
      data: '2026-06-20',
      conteudo_aula: 'Sem turma',
    }));
    expect(res.status).toBe(400);
  });

  test('POST /api/diario sem data retorna erro', async () => {
    const res = await authed(request(app).post('/api/diario').send({
      turma_id: 5,
      conteudo_aula: 'Sem data',
    }));
    expect(res.status).toBe(400);
  });

  test('GET /api/diario retorna lista', async () => {
    const res = await authed(request(app).get('/api/diario'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
    expect(Array.isArray(res.body.registros)).toBe(true);
  });

  test('GET /api/diario com filtro turma_id', async () => {
    const res = await authed(request(app).get('/api/diario?turma_id=5'));
    expect(res.status).toBe(200);
  });

  test('GET /api/diario/:id retorna registro', async () => {
    const res = await authed(request(app).get(`/api/diario/${createdDiarioId}`));
    expect(res.status).toBe(200);
    expect(res.body.conteudo_aula).toBe('Conteúdo de teste - Matemática');
  });

  test('PUT /api/diario/:id atualiza registro', async () => {
    const res = await authed(request(app)
      .put(`/api/diario/${createdDiarioId}`)
      .send({ conteudo_aula: 'Conteúdo atualizado' }));
    expect(res.status).toBe(200);
    expect(res.body.conteudo_aula).toBe('Conteúdo atualizado');
  });
});

// ============================================================
// 6. FREQUÊNCIAS
// ============================================================
describe('6. Frequências', () => {
  test('GET /api/frequencias sem turma_id retorna 400', async () => {
    const res = await authed(request(app).get('/api/frequencias'));
    expect(res.status).toBe(400);
  });

  test('GET /api/frequencias com parâmetros retorna registros', async () => {
    const res = await authed(request(app).get('/api/frequencias?turma_id=5&data=2026-06-20'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
    expect(Array.isArray(res.body.registros)).toBe(true);
    expect(res.body.turma_id).toBe(5);
    expect(res.body.data).toBe('2026-06-20');
  });

  test('POST /api/frequencias salva registros', async () => {
    const res = await authed(request(app).post('/api/frequencias').send({
      turma_id: 5,
      data: '2026-06-21',
      registros: [
        { aluno_id: 7, presente: true },
        { aluno_id: 8, presente: false },
      ],
    }));
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('sucesso');
    expect(res.body.count).toBe(2);
  });

  test('POST /api/frequencias sem registros retorna 400', async () => {
    const res = await authed(request(app).post('/api/frequencias').send({
      turma_id: 5,
      data: '2026-06-21',
    }));
    expect(res.status).toBe(400);
  });

  test('GET /api/frequencias/historico retorna datas', async () => {
    const res = await authed(request(app).get('/api/frequencias/historico?turma_id=5'));
    expect(res.status).toBe(200);
    expect(res.body.datas).toBeDefined();
    expect(Array.isArray(res.body.datas)).toBe(true);
  });

  test('GET /api/frequencias/relatorio retorna relatório', async () => {
    const res = await authed(request(app).get('/api/frequencias/relatorio?turma_id=5'));
    expect(res.status).toBe(200);
    expect(res.body.turma_nome).toBeDefined();
    expect(res.body.alunos).toBeDefined();
    expect(Array.isArray(res.body.alunos)).toBe(true);
  });
});

// ============================================================
// 7. MÉTRICAS
// ============================================================
describe('7. Métricas', () => {
  test('GET /api/metrics/presenca-geral retorna estatísticas', async () => {
    const res = await authed(request(app).get('/api/metrics/presenca-geral'));
    expect(res.status).toBe(200);
    expect(res.body.totalRegistros).toBeDefined();
    expect(res.body.percentualPresenca).toBeDefined();
  });

  test('GET /api/metrics/presenca-por-turma retorna por turma', async () => {
    const res = await authed(request(app).get('/api/metrics/presenca-por-turma'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/metrics/atividade-professoras retorna atividade', async () => {
    const res = await authed(request(app).get('/api/metrics/atividade-professoras'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/metrics/diario-resumo retorna resumo', async () => {
    const res = await authed(request(app).get('/api/metrics/diario-resumo'));
    expect(res.status).toBe(200);
    expect(res.body.totalRegistros).toBeDefined();
    expect(res.body.totalDias).toBeDefined();
  });

  test('GET /api/metrics/evolucao-semanal retorna série', async () => {
    const res = await authed(request(app).get('/api/metrics/evolucao-semanal'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ============================================================
// 8. BUSINESS INTELLIGENCE
// ============================================================
describe('8. Business Intelligence', () => {
  test('GET /api/bi/dashboard-direcao retorna KPIs', async () => {
    const res = await authed(request(app).get('/api/bi/dashboard-direcao'));
    expect(res.status).toBe(200);
    expect(res.body.presenca).toBeDefined();
    expect(res.body.diario).toBeDefined();
    expect(res.body.totais).toBeDefined();
  });

  test('GET /api/bi/evolucao-presenca retorna evolução', async () => {
    const res = await authed(request(app).get('/api/bi/evolucao-presenca'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/bi/ranking-turmas retorna ranking', async () => {
    const res = await authed(request(app).get('/api/bi/ranking-turmas'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/bi/ranking-professoras retorna ranking', async () => {
    const res = await authed(request(app).get('/api/bi/ranking-professoras'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/bi/kpis-compostos retorna KPIs compostos', async () => {
    const res = await authed(request(app).get('/api/bi/kpis-compostos'));
    expect(res.status).toBe(200);
    expect(res.body.mediaGeralPresenca).toBeDefined();
    expect(res.body.desvioPorTurma).toBeDefined();
  });
});

// ============================================================
// 9. IA EDUCACIONAL
// ============================================================
describe('9. IA Educacional', () => {
  test('GET /api/ai/risk/aluno/7 retorna score de risco', async () => {
    const res = await authed(request(app).get('/api/ai/risk/aluno/7'));
    expect(res.status).toBe(200);
    expect(res.body.risk_score).toBeDefined();
    expect(res.body.risk_level).toBeDefined();
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(res.body.risk_level);
    expect(res.body.scoreDetails).toBeDefined();
    expect(res.body.explanation).toBeDefined();
    expect(res.body.estatisticas).toBeDefined();
  });

  test('GET /api/ai/risk/aluno/99999 retorna 404', async () => {
    const res = await authed(request(app).get('/api/ai/risk/aluno/99999'));
    expect(res.status).toBe(404);
  });

  test('GET /api/ai/risk/turma/5 retorna risco da turma', async () => {
    const res = await authed(request(app).get('/api/ai/risk/turma/5'));
    expect(res.status).toBe(200);
    expect(res.body.turma_id).toBeDefined();
    expect(res.body.aggregados).toBeDefined();
    expect(res.body.alunos).toBeDefined();
  });

  test('GET /api/ai/risk/dashboard retorna dashboard', async () => {
    const res = await authed(request(app).get('/api/ai/risk/dashboard'));
    expect(res.status).toBe(200);
    expect(res.body.totalAlunos).toBeDefined();
    expect(res.body.porTurma).toBeDefined();
    expect(res.body.ranking).toBeDefined();
  });

  test('GET /api/ai/recommendations/aluno/7 retorna recomendações', async () => {
    const res = await authed(request(app).get('/api/ai/recommendations/aluno/7'));
    expect(res.status).toBe(200);
    expect(res.body.risk_level).toBeDefined();
    expect(res.body.recommendations).toBeDefined();
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  test('GET /api/ai/alerts retorna alertas', async () => {
    const res = await authed(request(app).get('/api/ai/alerts'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
    expect(Array.isArray(res.body.registros)).toBe(true);
  });
});

// ============================================================
// 10. RELATÓRIOS
// ============================================================
describe('10. Relatórios', () => {
  test('GET /api/reports/presenca.csv retorna CSV', async () => {
    const res = await authed(request(app).get('/api/reports/presenca.csv'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
  });

  test('GET /api/reports/turmas.csv retorna CSV', async () => {
    const res = await authed(request(app).get('/api/reports/turmas.csv'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
  });

  test('GET /api/reports/professoras.csv retorna CSV', async () => {
    const res = await authed(request(app).get('/api/reports/professoras.csv'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
  });

  test('GET /api/reports/geral.pdf retorna PDF', async () => {
    const res = await authed(request(app).get('/api/reports/geral.pdf'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
  });

  test('GET /api/reports/turma/5.pdf retorna PDF da turma', async () => {
    const res = await authed(request(app).get('/api/reports/turma/5.pdf'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
  });

  test('GET /api/reports/professora/1.pdf retorna PDF da professora', async () => {
    const res = await authed(request(app).get('/api/reports/professora/1.pdf'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
  });
});

// ============================================================
// 11. AUDITORIA
// ============================================================
describe('11. Auditoria', () => {
  test('GET /api/auditoria retorna logs', async () => {
    const res = await authed(request(app).get('/api/auditoria'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
    expect(Array.isArray(res.body.registros)).toBe(true);
    expect(res.body.total).toBeDefined();
  });

  test('GET /api/auditoria com filtro de ação', async () => {
    const res = await authed(request(app).get('/api/auditoria?action=VIEW'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
  });

  test('GET /api/auditoria/user/1 retorna logs do admin', async () => {
    const res = await authed(request(app).get('/api/auditoria/user/1'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
  });

  test('GET /api/auditoria/entity/aluno/1 retorna logs da entidade', async () => {
    const res = await authed(request(app).get('/api/auditoria/entity/aluno/1'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
  });
});

// ============================================================
// 12. GESTÃO DE USUÁRIOS
// ============================================================
describe('12. Gestão de Usuários', () => {
  test('GET /api/users retorna lista', async () => {
    const res = await authed(request(app).get('/api/users'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/users/1 retorna admin', async () => {
    const res = await authed(request(app).get('/api/users/1'));
    expect(res.status).toBe(200);
    expect(res.body.usuario).toBe('admin');
    expect(res.body).not.toHaveProperty('senha');
    expect(res.body).not.toHaveProperty('token_version');
  });

  test('POST /api/users cria usuário', async () => {
    const res = await authed(request(app).post('/api/users').send({
      usuario: `test_user_${Date.now()}`,
      senha: 'teste123',
      nome: 'Usuário Teste',
      role: 'professor',
    }));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    createdUserId = res.body.id;
  });

  test('POST /api/users com role professora é aceito', async () => {
    const res = await authed(request(app).post('/api/users').send({
      usuario: `test_prof_${Date.now()}`,
      senha: 'teste123',
      nome: 'Professora Role Test',
      role: 'professora',
    }));
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('professora');
  });

  test('POST /api/users com role inválida retorna 400', async () => {
    const res = await authed(request(app).post('/api/users').send({
      usuario: `test_invalid_${Date.now()}`,
      senha: 'teste123',
      nome: 'Role Inválida',
      role: 'invalido',
    }));
    expect(res.status).toBe(400);
  });

  test('PUT /api/users/:id atualiza usuário', async () => {
    const res = await authed(request(app)
      .put(`/api/users/${createdUserId}`)
      .send({ role: 'pedagogico' }));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('pedagogico');
  });

  test('DELETE /api/users/:id exclui usuário', async () => {
    const res = await authed(request(app).delete(`/api/users/${createdUserId}`));
    expect(res.status).toBe(200);
  });

  test('DELETE /api/users/1 admin não pode se excluir', async () => {
    const res = await authed(request(app).delete('/api/users/1'));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('si mesmo');
  });
});

// ============================================================
// 13. RBAC - CONTROLE DE ACESSO
// ============================================================
describe('13. RBAC - Controle de Acesso', () => {
  test('Acesso sem token retorna 401 em todas as rotas protegidas', async () => {
    const routes = [
      '/api/alunos',
      '/api/professoras',
      '/api/turmas',
      '/api/diario',
      '/api/metrics/presenca-geral',
      '/api/bi/dashboard-direcao',
      '/api/ai/alerts',
      '/api/users',
    ];
    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });

  test('Rate limit no login funciona', async () => {
    const promises = [];
    for (let i = 0; i < 32; i++) {
      promises.push(
        request(app).post('/api/login').send({ usuario: 'admin', senha: 'errada' })
      );
    }
    const results = await Promise.all(promises);
    const rateLimited = results.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});

// ============================================================
// 14. VÍNCULO PROFESSORA-TURMA (correção do bug)
// ============================================================
describe('14. Vínculo Professora-Turma (correção)', () => {
  test('Vínculo e desvínculo funcionam corretamente', async () => {
    if (!createdProfessoraId || !createdTurmaId) return;

    const vincRes = await authed(request(app)
      .post(`/api/turmas/${createdTurmaId}/professoras`)
      .send({ professora_id: createdProfessoraId, principal: true }));
    expect(vincRes.status).toBe(201);

    const listRes = await authed(request(app).get(`/api/turmas/${createdTurmaId}/professoras`));
    expect(listRes.status).toBe(200);
    expect(listRes.body.professoras.length).toBeGreaterThan(0);

    const delRes = await authed(request(app)
      .delete(`/api/turmas/${createdTurmaId}/professora/${createdProfessoraId}`));
    expect(delRes.status).toBe(200);
  });
});

// ============================================================
// 15. LIMPEZA - Remover dados de teste
// ============================================================
describe('15. Limpeza', () => {
  test('Remove turma de teste', async () => {
    if (!createdTurmaId) return;
    const res = await authed(request(app).delete(`/api/turmas/${createdTurmaId}`));
    expect(res.status).toBe(200);
  });

  test('Remove professora de teste', async () => {
    if (!createdProfessoraId) return;
    const res = await authed(request(app).delete(`/api/professoras/${createdProfessoraId}`));
    expect(res.status).toBe(200);
  });
});
