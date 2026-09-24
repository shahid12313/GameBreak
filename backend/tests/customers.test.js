'use strict';
const request = require('supertest');
const { resetInstance } = require('./support/mockModels');
const { bootstrapOwner } = require('./support/helpers');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

test('create, search, and update a customer', async () => {
  const owner = await bootstrapOwner(app);
  const c = await request(app).post('/api/customers').set('Authorization', `Bearer ${owner.token}`).send({ name: 'Ayesha Farooq', phone: '0300-1112222' });
  expect(c.status).toBe(201);

  const found = await request(app).get('/api/customers?q=ayesha').set('Authorization', `Bearer ${owner.token}`);
  expect(found.body.length).toBe(1);
  const byPhone = await request(app).get('/api/customers?q=1112222').set('Authorization', `Bearer ${owner.token}`);
  expect(byPhone.body.length).toBe(1);

  const updated = await request(app).put(`/api/customers/${c.body._id}`).set('Authorization', `Bearer ${owner.token}`).send({ phone: '0300-9998888' });
  expect(updated.body.phone).toBe('0300-9998888');
});

test('settling a customer with no balance due is rejected', async () => {
  const owner = await bootstrapOwner(app);
  const c = await request(app).post('/api/customers').set('Authorization', `Bearer ${owner.token}`).send({ name: 'No Debt' });
  const res = await request(app).post(`/api/customers/${c.body._id}/settle`).set('Authorization', `Bearer ${owner.token}`);
  expect(res.status).toBe(400);
});

test("a customer's history endpoint returns their sessions and bookings", async () => {
  const owner = await bootstrapOwner(app);
  const c = await request(app).post('/api/customers').set('Authorization', `Bearer ${owner.token}`).send({ name: 'Bilal Khan' });
  const hist = await request(app).get(`/api/customers/${c.body._id}/history`).set('Authorization', `Bearer ${owner.token}`);
  expect(hist.status).toBe(200);
  expect(Array.isArray(hist.body.sessions)).toBe(true);
  expect(Array.isArray(hist.body.bookings)).toBe(true);
});
