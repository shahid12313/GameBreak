'use strict';
const request = require('supertest');
const { resetInstance } = require('./support/mockModels');
const { bootstrapOwner, makeGame } = require('./support/helpers');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

test('staff can create a booking by hand, with a real reference like GB-YYYY-00001', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${owner.token}`).send({
    name: 'Omar Ahmed', phone: '0300-1111111', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 60
  });
  expect(res.status).toBe(201);
  expect(res.body.ref).toMatch(/^GB-\d{4}-\d{5}$/);
  expect(res.body.price).toBe(500);
});

test('booking references increment sequentially within the year', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  // Different times so the single default station doesn't make the second
  // booking collide with the first (a same-slot collision is covered by the
  // dedicated capacity test below, and is correctly rejected there).
  const mk = hoursAhead => request(app).post('/api/bookings').set('Authorization', `Bearer ${owner.token}`).send({
    name: 'X', phone: '0300-0000000', gameId: game._id, t: new Date(Date.now() + hoursAhead * 3600e3).toISOString(), durationMinutes: 60
  });
  const a = await mk(3), b = await mk(6);
  expect(a.body.ref).toMatch(/^GB-\d{4}-\d{5}$/);
  expect(b.body.ref).toMatch(/^GB-\d{4}-\d{5}$/);
  const numA = Number(a.body.ref.split('-')[2]), numB = Number(b.body.ref.split('-')[2]);
  expect(numB).toBe(numA + 1);
});

test('a booking cannot be made for an invalid duration for that game', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${owner.token}`).send({
    name: 'X', phone: '0300-0000000', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 45
  });
  expect(res.status).toBe(400);
});

test('booking status and payment status can be updated, restricted to valid enum values', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const b = await request(app).post('/api/bookings').set('Authorization', `Bearer ${owner.token}`).send({
    name: 'X', phone: '0300-0000000', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 60
  });
  const ok = await request(app).put(`/api/bookings/${b.body._id}/status`).set('Authorization', `Bearer ${owner.token}`).send({ status: 'no-show' });
  expect(ok.status).toBe(200);
  expect(ok.body.status).toBe('no-show');
  const bad = await request(app).put(`/api/bookings/${b.body._id}/status`).set('Authorization', `Bearer ${owner.token}`).send({ status: 'bogus' });
  expect(bad.status).toBe(400);
  const pay = await request(app).put(`/api/bookings/${b.body._id}/pay`).set('Authorization', `Bearer ${owner.token}`).send({ pay: 'Paid' });
  expect(pay.body.pay).toBe('Paid');
});

test('checking in a confirmed booking starts a real session on a free station', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const b = await request(app).post('/api/bookings').set('Authorization', `Bearer ${owner.token}`).send({
    name: 'Walk-in', phone: '0300-0000000', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 60
  });
  const checkin = await request(app).post(`/api/bookings/${b.body._id}/check-in`).set('Authorization', `Bearer ${owner.token}`);
  expect(checkin.status).toBe(201);
  expect(checkin.body.status).toBe('active');

  const board = await request(app).get('/api/sessions/board').set('Authorization', `Bearer ${owner.token}`);
  expect(board.body.some(s => s.status === 'running')).toBe(true);

  const bookingNow = await request(app).get('/api/bookings').set('Authorization', `Bearer ${owner.token}`);
  expect(bookingNow.body.find(x => x._id === b.body._id).status).toBe('confirmed');
});

test('checking in when every station for that game is busy is rejected', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 }); // only 1 station by default
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  await request(app).post('/api/sessions/start').set('Authorization', `Bearer ${owner.token}`).send({ stationId, pkIndex: 1 });

  const b = await request(app).post('/api/bookings').set('Authorization', `Bearer ${owner.token}`).send({
    name: 'X', phone: '0300-0000000', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 60
  });
  const checkin = await request(app).post(`/api/bookings/${b.body._id}/check-in`).set('Authorization', `Bearer ${owner.token}`);
  expect(checkin.status).toBe(409);
});

test('a second booking for the same single-station game at an overlapping time is rejected as fully booked', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 }); // 1 station
  const t = new Date(Date.now() + 3 * 3600e3).toISOString();
  const first = await request(app).post('/api/bookings').set('Authorization', `Bearer ${owner.token}`).send({ name: 'A', phone: '0300-1', gameId: game._id, t, durationMinutes: 60 });
  expect(first.status).toBe(201);
  const second = await request(app).post('/api/bookings').set('Authorization', `Bearer ${owner.token}`).send({ name: 'B', phone: '0300-2', gameId: game._id, t, durationMinutes: 60 });
  expect(second.status).toBe(409);
});
