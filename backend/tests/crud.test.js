'use strict';
const request = require('supertest');
const { resetInstance } = require('./support/mockModels');
const { bootstrapOwner } = require('./support/helpers');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

test('discount codes: create, disable, delete', async () => {
  const owner = await bootstrapOwner(app);
  const c = await request(app).post('/api/discounts').set('Authorization', `Bearer ${owner.token}`).send({ code: 'happyhour', type: 'percent', value: 20 });
  expect(c.status).toBe(201);
  expect(c.body.code).toBe('HAPPYHOUR'); // stored uppercase

  const off = await request(app).put(`/api/discounts/${c.body._id}`).set('Authorization', `Bearer ${owner.token}`).send({ active: false });
  expect(off.body.active).toBe(false);

  const del = await request(app).delete(`/api/discounts/${c.body._id}`).set('Authorization', `Bearer ${owner.token}`);
  expect(del.status).toBe(204);
  const list = await request(app).get('/api/discounts').set('Authorization', `Bearer ${owner.token}`);
  expect(list.body.length).toBe(0);
});

test('expenses: create, list filtered by month, delete', async () => {
  const owner = await bootstrapOwner(app);
  await request(app).post('/api/expenses').set('Authorization', `Bearer ${owner.token}`).send({ description: 'Rent', category: 'Rent', amount: 28000, date: '2026-05-02' });
  await request(app).post('/api/expenses').set('Authorization', `Bearer ${owner.token}`).send({ description: 'Internet', category: 'Internet', amount: 4500, date: '2026-06-02' });

  const may = await request(app).get('/api/expenses?month=2026-05').set('Authorization', `Bearer ${owner.token}`);
  expect(may.body.length).toBe(1);
  expect(may.body[0].description).toBe('Rent');

  const del = await request(app).delete(`/api/expenses/${may.body[0]._id}`).set('Authorization', `Bearer ${owner.token}`);
  expect(del.status).toBe(204);
});

test('an expense of 0 or negative amount is rejected', async () => {
  const owner = await bootstrapOwner(app);
  const res = await request(app).post('/api/expenses').set('Authorization', `Bearer ${owner.token}`).send({ description: 'X', amount: 0, date: '2026-05-02' });
  expect(res.status).toBe(400);
});

test('inventory: create item, restock also logs an expense automatically', async () => {
  const owner = await bootstrapOwner(app);
  const item = await request(app).post('/api/inventory').set('Authorization', `Bearer ${owner.token}`).send({ name: 'Chips', cost: 50, price: 100, stock: 5, sellable: true });
  expect(item.status).toBe(201);

  const restocked = await request(app).post(`/api/inventory/${item.body._id}/restock`).set('Authorization', `Bearer ${owner.token}`).send({ qty: 20 });
  expect(restocked.body.stock).toBe(25);

  const expenses = await request(app).get('/api/expenses').set('Authorization', `Bearer ${owner.token}`);
  expect(expenses.body.some(e => e.description.includes('Chips') && e.amount === 1000)).toBe(true); // 20 * 50 cost

  const tx = await request(app).get(`/api/inventory/${item.body._id}/transactions`).set('Authorization', `Bearer ${owner.token}`);
  expect(tx.body.length).toBe(1);
  expect(tx.body[0].type).toBe('in');
});

test('a non-sellable inventory item ignores any submitted price', async () => {
  const owner = await bootstrapOwner(app);
  const item = await request(app).post('/api/inventory').set('Authorization', `Bearer ${owner.token}`).send({ name: 'Tissue', cost: 100, price: 999, stock: 10, sellable: false });
  expect(item.body.price).toBe(0);
});

test('events: create, update, delete, and registrations are visible to staff', async () => {
  const owner = await bootstrapOwner(app);
  const ev = await request(app).post('/api/events').set('Authorization', `Bearer ${owner.token}`).send({ title: 'Weekly Snooker Knockout', t: new Date(Date.now() + 86400e3).toISOString(), fee: 500 });
  expect(ev.status).toBe(201);

  await request(app).post(`/api/public/events/${ev.body._id}/register`).send({ name: 'Hassan', phone: '0300-1' });
  const regs = await request(app).get(`/api/events/${ev.body._id}/registrations`).set('Authorization', `Bearer ${owner.token}`);
  expect(regs.body.length).toBe(1);

  const starred = await request(app).put(`/api/events/${ev.body._id}`).set('Authorization', `Bearer ${owner.token}`).send({ starred: true });
  expect(starred.body.starred).toBe(true);

  const del = await request(app).delete(`/api/events/${ev.body._id}`).set('Authorization', `Bearer ${owner.token}`);
  expect(del.status).toBe(204);
});
