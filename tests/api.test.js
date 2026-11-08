import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import './setup.js';

let app;
beforeAll(async () => {
  const mod = await import('../src/server.js');
  app = mod.default;
});

describe('API: аутентификация', () => {
  it('POST /api/auth/register создаёт пользователя', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@a.ru', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('a@a.ru');
    expect(res.body.user.id).toBeTypeOf('number');
  });

  it('POST /api/auth/register возвращает 409 для дубликата', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dup@a.ru', password: 'secret123' });
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@a.ru', password: 'secret123' });
    expect(res.status).toBe(409);
  });
});

describe('API: защита маршрутов', () => {
  it('GET /api/transactions без авторизации возвращает 401', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });
});

describe('API: IDOR-защита', () => {
  it('нельзя создать операцию с чужой категорией (id=999999)', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ email: 'idor@a.ru', password: 'secret123' });

    const res = await agent
      .post('/api/transactions')
      .send({ category_id: 999999, amount: 100, date: '2026-11-15' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Категория не найдена');
  });
});