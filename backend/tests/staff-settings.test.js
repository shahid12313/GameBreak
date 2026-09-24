'use strict';
const request = require('supertest');
const { resetInstance } = require('./support/mockModels');
const { bootstrapOwner, addStaff } = require('./support/helpers');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

test('Owner can add, change role of, disable, and remove staff — but never their own account', async () => {
  const owner = await bootstrapOwner(app);
  const created = await request(app).post('/api/staff').set('Authorization', `Bearer ${owner.token}`).send({ email: 'mgr@test.com', password: 'secret123', role: 'Manager', name: 'Manager One' });
  expect(created.status).toBe(201);
  expect(created.body.passwordHash).toBeUndefined(); // never leaked

  const promoted = await request(app).put(`/api/staff/${created.body._id}`).set('Authorization', `Bearer ${owner.token}`).send({ role: 'Admin' });
  expect(promoted.body.role).toBe('Admin');

  const disabled = await request(app).put(`/api/staff/${created.body._id}`).set('Authorization', `Bearer ${owner.token}`).send({ active: false });
  expect(disabled.body.active).toBe(false);

  const selfEdit = await request(app).put(`/api/staff/${(await request(app).get('/api/staff').set('Authorization', `Bearer ${owner.token}`)).body.find(s => s.email === owner.user.email)._id}`)
    .set('Authorization', `Bearer ${owner.token}`).send({ role: 'Staff' });
  expect(selfEdit.status).toBe(400);

  const del = await request(app).delete(`/api/staff/${created.body._id}`).set('Authorization', `Bearer ${owner.token}`);
  expect(del.status).toBe(204);
});

test('an Admin (not Owner) cannot manage staff accounts at all', async () => {
  const owner = await bootstrapOwner(app);
  const admin = await addStaff(app, owner.token, { email: 'admin@test.com', role: 'Admin' });
  const res = await request(app).post('/api/staff').set('Authorization', `Bearer ${admin.token}`).send({ email: 'x@test.com', password: 'secret123', role: 'Staff' });
  expect(res.status).toBe(403);
});

test('resetting a staff password lets them log in with the new one', async () => {
  const owner = await bootstrapOwner(app);
  const staff = await addStaff(app, owner.token, { email: 'till@test.com', role: 'Staff' });
  const reset = await request(app).post(`/api/staff/${staff.id}/reset-password`).set('Authorization', `Bearer ${owner.token}`).send({ password: 'newpass123' });
  expect(reset.status).toBe(200);
  const login = await request(app).post('/api/auth/login').send({ email: 'till@test.com', password: 'newpass123' });
  expect(login.status).toBe(200);
});

test('business settings can be read by any staff but only changed by Admin+', async () => {
  const owner = await bootstrapOwner(app);
  const staff = await addStaff(app, owner.token, { email: 'till@test.com', role: 'Staff' });

  const read = await request(app).get('/api/settings').set('Authorization', `Bearer ${staff.token}`);
  expect(read.status).toBe(200);

  const deniedWrite = await request(app).put('/api/settings').set('Authorization', `Bearer ${staff.token}`).send({ name: 'Hacked' });
  expect(deniedWrite.status).toBe(403);

  const write = await request(app).put('/api/settings').set('Authorization', `Bearer ${owner.token}`).send({ name: 'GameBreak Lahore', open: 9, close: 25 });
  expect(write.status).toBe(200);
  expect(write.body.name).toBe('GameBreak Lahore');

  const badHours = await request(app).put('/api/settings').set('Authorization', `Bearer ${owner.token}`).send({ open: 20, close: 10 });
  expect(badHours.status).toBe(400);
});
