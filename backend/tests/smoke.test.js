'use strict';
const request = require('supertest');
const { resetInstance } = require('./support/mockModels');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

test('health check responds', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
});

test('bootstrap creates the first Owner account and returns a working token', async () => {
  const boot = await request(app).post('/api/auth/bootstrap').send({ name: 'Shahid', email: 'owner@test.com', password: 'secret1' });
  expect(boot.status).toBe(201);
  expect(boot.body.user.role).toBe('Owner');
  expect(typeof boot.body.token).toBe('string');

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${boot.body.token}`);
  expect(me.status).toBe(200);
  expect(me.body.user.email).toBe('owner@test.com');
});

test('bootstrap refuses once an account already exists', async () => {
  await request(app).post('/api/auth/bootstrap').send({ email: 'owner@test.com', password: 'secret1' });
  const second = await request(app).post('/api/auth/bootstrap').send({ email: 'someone@test.com', password: 'secret1' });
  expect(second.status).toBe(409);
});

test('wrong password is rejected', async () => {
  await request(app).post('/api/auth/bootstrap').send({ email: 'owner@test.com', password: 'secret1' });
  const res = await request(app).post('/api/auth/login').send({ email: 'owner@test.com', password: 'wrong' });
  expect(res.status).toBe(401);
});

test('a protected route rejects a missing token', async () => {
  const res = await request(app).get('/api/games');
  expect(res.status).toBe(401);
});
