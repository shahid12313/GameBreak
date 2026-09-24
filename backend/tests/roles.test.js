'use strict';
const request = require('supertest');
const { resetInstance } = require('./support/mockModels');
const { bootstrapOwner, addStaff } = require('./support/helpers');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

test('Staff role can reach sessions/customers but not pricing/revenue/staff', async () => {
  const owner = await bootstrapOwner(app);
  const staff = await addStaff(app, owner.token, { email: 'till@test.com', role: 'Staff' });

  const sessions = await request(app).get('/api/sessions/board').set('Authorization', `Bearer ${staff.token}`);
  expect(sessions.status).toBe(200);
  const customers = await request(app).get('/api/customers').set('Authorization', `Bearer ${staff.token}`);
  expect(customers.status).toBe(200);

  const pricing = await request(app).post('/api/pricing').set('Authorization', `Bearer ${staff.token}`).send({});
  expect(pricing.status).toBe(403);
  const revenue = await request(app).get('/api/revenue/summary').set('Authorization', `Bearer ${staff.token}`);
  expect(revenue.status).toBe(403);
  const staffList = await request(app).get('/api/staff').set('Authorization', `Bearer ${staff.token}`);
  expect(staffList.status).toBe(403);
  const bookings = await request(app).get('/api/bookings').set('Authorization', `Bearer ${staff.token}`);
  expect(bookings.status).toBe(403); // bookings need Manager+
});

test('Manager can reach bookings/waiting but not pricing/staff', async () => {
  const owner = await bootstrapOwner(app);
  const mgr = await addStaff(app, owner.token, { email: 'mgr@test.com', role: 'Manager' });
  const bookings = await request(app).get('/api/bookings').set('Authorization', `Bearer ${mgr.token}`);
  expect(bookings.status).toBe(200);
  const pricing = await request(app).delete('/api/pricing/x').set('Authorization', `Bearer ${mgr.token}`);
  expect(pricing.status).toBe(403);
});

test('Admin can reach revenue/expenses/inventory but not staff management', async () => {
  const owner = await bootstrapOwner(app);
  const admin = await addStaff(app, owner.token, { email: 'admin@test.com', role: 'Admin' });
  const revenue = await request(app).get('/api/revenue/summary').set('Authorization', `Bearer ${admin.token}`);
  expect(revenue.status).toBe(200);
  const staffList = await request(app).get('/api/staff').set('Authorization', `Bearer ${admin.token}`);
  expect(staffList.status).toBe(403); // staff accounts are Owner-only
});

test('Owner can reach everything, including staff management', async () => {
  const owner = await bootstrapOwner(app);
  const staffList = await request(app).get('/api/staff').set('Authorization', `Bearer ${owner.token}`);
  expect(staffList.status).toBe(200);
});

test('a disabled staff account is rejected even with a previously-valid token', async () => {
  const owner = await bootstrapOwner(app);
  const staff = await addStaff(app, owner.token, { email: 'gone@test.com', role: 'Staff' });
  await request(app).put(`/api/staff/${staff.id}`).set('Authorization', `Bearer ${owner.token}`).send({ active: false });
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${staff.token}`);
  expect(me.status).toBe(401);
});

test('an expired/garbage token is rejected, not crashed on', async () => {
  const res = await request(app).get('/api/games').set('Authorization', 'Bearer not-a-real-token');
  expect(res.status).toBe(401);
});

test('Staff can read pricing (needed to start a session) but cannot edit it', async () => {
  const { makeGame } = require('./support/helpers');
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const staff = await addStaff(app, owner.token, { email: 'till2@test.com', role: 'Staff' });
  const read = await request(app).get(`/api/games/${game._id}/pricing`).set('Authorization', `Bearer ${staff.token}`);
  expect(read.status).toBe(200);
  expect(read.body.weekday.method).toBe('session');
  const write = await request(app).post('/api/pricing').set('Authorization', `Bearer ${staff.token}`).send({ gameId: game._id, kind: 'session', durationMinutes: 45, price: 300 });
  expect(write.status).toBe(403);
});
