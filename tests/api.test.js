const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const request = require('supertest');
const app = require('../backend/server');
const db = require('../backend/database/connection');

let adminToken;
let server;

async function login() {
  const res = await request(app)
    .post('/api/login')
    .send({ usuario: 'admin', senha: 'admin123' });
  return res.body.token;
}

beforeAll(async () => {
  server = app.listen(0);
  await db('usuarios').where({ usuario: 'admin' }).update({ token_version: 0 });
  adminToken = await login();
});

afterAll(() => {
  server?.close();
});

afterAll(() => {
  server?.close();
});

function authed(req) {
  return req.set('Authorization', `Bearer ${adminToken}`);
}

describe('Autenticação', () => {
  test('GET /api/login sem credenciais retorna erro', async () => {
    const res = await request(app).post('/api/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('POST /api/login com credenciais válidas retorna token', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ usuario: 'admin', senha: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  test('GET /api/alunos sem token retorna 401', async () => {
    const res = await request(app).get('/api/alunos');
    expect(res.status).toBe(401);
  });
});

describe('Turmas', () => {
  test('GET /api/turmas retorna lista', async () => {
    const res = await authed(request(app).get('/api/turmas'));
    expect(res.status).toBe(200);
    expect(res.body.turmas.length).toBeGreaterThanOrEqual(4);
    const nomes = res.body.turmas.map(t => t.nome);
    expect(nomes).toContain('Maternal I');
    expect(nomes).toContain('Maternal II');
    expect(nomes).toContain('Jardim I');
    expect(nomes).toContain('Jardim II');
  });
});

describe('Alunos', () => {
  test('GET /api/alunos retorna lista paginada', async () => {
    const res = await authed(request(app).get('/api/alunos'));
    expect(res.status).toBe(200);
    expect(res.body.alunos).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
  });

  test('GET /api/alunos?turma_id=5 retorna alunos do Maternal I', async () => {
    const res = await authed(request(app).get('/api/alunos?turma_id=5'));
    expect(res.status).toBe(200);
    res.body.alunos.forEach(a => {
      expect(a.turma_id).toBe(5);
    });
  });
});

describe('Frequências', () => {
  test('GET /api/frequencias sem turma_id retorna 400', async () => {
    const res = await authed(request(app).get('/api/frequencias'));
    expect(res.status).toBe(400);
  });

  test('GET /api/frequencias com turma_id e data retorna registros', async () => {
    const res = await authed(request(app).get('/api/frequencias?turma_id=5&data=2026-06-11'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
    expect(Array.isArray(res.body.registros)).toBe(true);
  });

  test('POST /api/frequencias salva registros', async () => {
    const res = await authed(request(app).post('/api/frequencias').send({
      turma_id: 5,
      data: '2026-06-12',
      registros: [{ aluno_id: 7, presente: true }],
    }));
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('sucesso');
  });
});

describe('Relatórios', () => {
  test('GET /api/reports/presenca.csv retorna CSV', async () => {
    const res = await authed(request(app).get('/api/reports/presenca.csv'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/csv/);
  });

  test('GET /api/reports/geral.pdf retorna PDF', async () => {
    const res = await authed(request(app).get('/api/reports/geral.pdf'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
  });
});

describe('BI', () => {
  test('GET /api/bi/dashboard-direcao retorna KPIs', async () => {
    const res = await authed(request(app).get('/api/bi/dashboard-direcao'));
    expect(res.status).toBe(200);
    expect(res.body.presenca).toBeDefined();
    expect(res.body.totais).toBeDefined();
  });
});

describe('IA Educacional', () => {
  test('GET /api/ai/risk/aluno/7 retorna score', async () => {
    const res = await authed(request(app).get('/api/ai/risk/aluno/7'));
    expect(res.status).toBe(200);
    expect(res.body.risk_score).toBeDefined();
    expect(res.body.risk_level).toBeDefined();
    expect(res.body.scoreDetails).toBeDefined();
    expect(res.body.explanation).toBeDefined();
  });
});

describe('RBAC', () => {
  test('GET /api/bi/ranking-turmas sem token retorna 401', async () => {
    const res = await request(app).get('/api/bi/ranking-turmas');
    expect(res.status).toBe(401);
  });
});

describe('Auth Refresh', () => {
  test('POST /api/auth/refresh retorna novo token', async () => {
    const res = await authed(request(app).post('/api/auth/refresh'));
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.token).not.toBe(adminToken);
    adminToken = res.body.token;
  });

  test('POST /api/auth/refresh token antigo é revogado', async () => {
    await db('usuarios').where({ usuario: 'admin' }).update({ token_version: 0 });
    const freshToken = await login();
    const res1 = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${freshToken}`);
    expect(res1.status).toBe(200);
    const res2 = await request(app)
      .get('/api/alunos')
      .set('Authorization', `Bearer ${freshToken}`);
    expect(res2.status).toBe(403);
    adminToken = res1.body.token;
  });
});

describe('BI', () => {
  test('GET /api/bi/evolucao-presenca retorna série temporal', async () => {
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

  test('GET /api/bi/kpis-compostos retorna KPIs', async () => {
    const res = await authed(request(app).get('/api/bi/kpis-compostos'));
    expect(res.status).toBe(200);
    expect(res.body.mediaGeralPresenca).toBeDefined();
  });
});

describe('IA Educacional', () => {
  test('GET /api/ai/risk/turma/5 retorna score da turma', async () => {
    const res = await authed(request(app).get('/api/ai/risk/turma/5'));
    expect(res.status).toBe(200);
    expect(res.body.risk_score || res.body.risk_level || res.body.alunos).toBeDefined();
  });

  test('GET /api/ai/risk/dashboard retorna dashboard de risco', async () => {
    const res = await authed(request(app).get('/api/ai/risk/dashboard'));
    expect(res.status).toBe(200);
    expect(res.body.totalAlunos).toBeDefined();
  });

  test('GET /api/ai/recommendations/aluno/7 retorna recomendações', async () => {
    const res = await authed(request(app).get('/api/ai/recommendations/aluno/7'));
    expect(res.status).toBe(200);
    expect(res.body.recommendations || res.body.recomendacoes).toBeDefined();
  });

  test('GET /api/ai/alerts retorna lista de alertas', async () => {
    const res = await authed(request(app).get('/api/ai/alerts'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
  });
});

describe('Auditoria', () => {
  test('GET /api/auditoria retorna logs de auditoria', async () => {
    const res = await authed(request(app).get('/api/auditoria'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
  });

  test('GET /api/auditoria/user/1 retorna logs do admin', async () => {
    const res = await authed(request(app).get('/api/auditoria/user/1'));
    expect(res.status).toBe(200);
    expect(res.body.registros).toBeDefined();
  });
});
