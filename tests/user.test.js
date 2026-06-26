const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const request = require('supertest');
const app = require('../backend/server');
const db = require('../backend/database/connection');

let adminToken;

async function login() {
  const res = await request(app)
    .post('/api/login')
    .send({ usuario: 'admin', senha: 'admin123' });
  return res.body.token;
}

beforeAll(async () => {
  await db('usuarios').where({ usuario: 'admin' }).update({ token_version: 0 });
  adminToken = await login();
});

function authed(req) {
  return req.set('Authorization', `Bearer ${adminToken}`);
}

function uniqueUser(suffix) {
  return {
    usuario: `testuser_${suffix}_${Date.now()}`,
    senha: 'test123',
    nome: `Usuário Teste ${suffix}`,
    role: 'professor',
  };
}

describe('Usuários - Gestão de Permissões', () => {
  test('GET /api/users retorna lista de usuários', async () => {
    const res = await authed(request(app).get('/api/users'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const adminUser = res.body.find(u => u.role === 'admin');
    expect(adminUser).toBeDefined();
    expect(adminUser.usuario).toBe('admin');
  });

  test('GET /api/users/:id retorna usuário específico', async () => {
    const res = await authed(request(app).get('/api/users/1'));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.usuario).toBe('admin');
    expect(res.body.role).toBe('admin');
    expect(res.body).not.toHaveProperty('senha');
    expect(res.body).not.toHaveProperty('token_version');
  });

  test('POST /api/users cria novo usuário', async () => {
    const userData = uniqueUser('create');
    const res = await authed(request(app).post('/api/users').send(userData));
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.usuario).toBe(userData.usuario);
    expect(res.body.nome).toBe(userData.nome);
    expect(res.body.role).toBe('professor');
    expect(res.body).not.toHaveProperty('senha');
  });

  test('POST /api/users com role inválida retorna erro', async () => {
    const userData = { ...uniqueUser('invalid'), role: 'invalido' };
    const res = await authed(request(app).post('/api/users').send(userData));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('inválida');
  });

  test('PUT /api/users/:id atualiza role do usuário', async () => {
    const createRes = await authed(request(app).post('/api/users').send(uniqueUser('update')));
    const userId = createRes.body.id;

    const updateRes = await authed(request(app).put(`/api/users/${userId}`).send({ role: 'pedagogico' }));
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.role).toBe('pedagogico');
  });

  test('PUT /api/users/:id com role inválida retorna erro', async () => {
    const createRes = await authed(request(app).post('/api/users').send(uniqueUser('invalid2')));
    const userId = createRes.body.id;

    const updateRes = await authed(request(app).put(`/api/users/${userId}`).send({ role: 'invalido' }));
    expect(updateRes.status).toBe(400);
    expect(updateRes.body.error).toContain('inválida');
  });

  test('DELETE /api/users/:id exclui usuário', async () => {
    const createRes = await authed(request(app).post('/api/users').send(uniqueUser('delete')));
    const userId = createRes.body.id;

    const deleteRes = await authed(request(app).delete(`/api/users/${userId}`));
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const getRes = await authed(request(app).get(`/api/users/${userId}`));
    expect(getRes.status).toBe(404);
  });

  test('DELETE /api/users/:id admin não pode se excluir (próprio usuário)', async () => {
    const deleteRes = await authed(request(app).delete('/api/users/1'));
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.error).toContain('si mesmo');
  });
});