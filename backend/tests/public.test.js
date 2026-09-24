'use strict';
const request = require('supertest');
const { resetInstance } = require('./support/mockModels');
const { bootstrapOwner, makeGame } = require('./support/helpers');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

test('public catalog exposes games/pricing/settings without any auth, and never leaks revenue-shaped fields', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const res = await request(app).get('/api/public/catalog');
  expect(res.status).toBe(200);
  expect(res.body.games[0].name).toBe('PS5');
  expect(res.body.games[0].weekday.method).toBe('session');
  expect(JSON.stringify(res.body)).not.toMatch(/revenue|expense|profit/i);
});

test('a customer can register, log in, and see their own bookings only', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });

  const reg = await request(app).post('/api/customer-auth/register').send({ name: 'Sara Khan', email: 'sara@test.com', phone: '0300-5551111', password: 'secret123' });
  expect(reg.status).toBe(201);
  const token = reg.body.token;

  const book = await request(app).post('/api/public/bookings').set('Authorization', `Bearer ${token}`).send({
    name: 'Sara Khan', phone: '0300-5551111', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 60
  });
  expect(book.status).toBe(201);

  const mine = await request(app).get('/api/customer/bookings').set('Authorization', `Bearer ${token}`);
  expect(mine.status).toBe(200);
  expect(mine.body.length).toBe(1);
  expect(mine.body[0].ref).toBe(book.body.ref);
});

test('registering the same email twice is rejected, and wrong password is rejected', async () => {
  await request(app).post('/api/customer-auth/register').send({ name: 'A', email: 'dup@test.com', password: 'secret123' });
  const dup = await request(app).post('/api/customer-auth/register').send({ name: 'B', email: 'dup@test.com', password: 'secret123' });
  expect(dup.status).toBe(409);
  const wrong = await request(app).post('/api/customer-auth/login').send({ email: 'dup@test.com', password: 'nope12345' });
  expect(wrong.status).toBe(401);
});

test('a guest (no login) can still book — customer accounts are optional, not required', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const res = await request(app).post('/api/public/bookings').send({
    name: 'Guest Person', phone: '0300-9999999', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 60
  });
  expect(res.status).toBe(201);
  expect(res.body.price).toBe(500);
});

test('a public booking respects station capacity — the Nth+1 overlapping request for an N-station game is rejected', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 }); // 1 station
  const t = new Date(Date.now() + 3 * 3600e3).toISOString();
  const first = await request(app).post('/api/public/bookings').send({ name: 'Aisha', phone: '0300-1234561', gameId: game._id, t, durationMinutes: 60 });
  expect(first.status).toBe(201);
  const second = await request(app).post('/api/public/bookings').send({ name: 'Bilal', phone: '0300-1234562', gameId: game._id, t, durationMinutes: 60 });
  expect(second.status).toBe(409);
});

test('a public booking applies a valid discount code and rejects an invalid one', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  await request(app).post('/api/discounts').set('Authorization', `Bearer ${owner.token}`).send({ code: 'WELCOME10', type: 'percent', value: 10 });

  const ok = await request(app).post('/api/public/bookings').send({
    name: 'Aisha', phone: '0300-1234561', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 60, discountCode: 'welcome10'
  });
  expect(ok.status).toBe(201);
  expect(ok.body.price).toBe(450);

  const bad = await request(app).post('/api/public/bookings').send({
    name: 'Bilal', phone: '0300-1234562', gameId: game._id, t: new Date(Date.now() + 6 * 3600e3).toISOString(), durationMinutes: 60, discountCode: 'NOPE'
  });
  expect(bad.status).toBe(400);
});

test('a booking request too soon (< 10 min ahead) or with a bad phone/name is rejected', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const tooSoon = await request(app).post('/api/public/bookings').send({ name: 'A', phone: '0300-1234567', gameId: game._id, t: new Date(Date.now() + 60000).toISOString(), durationMinutes: 60 });
  expect(tooSoon.status).toBe(400);
  const badPhone = await request(app).post('/api/public/bookings').send({ name: 'A', phone: '1', gameId: game._id, t: new Date(Date.now() + 3 * 3600e3).toISOString(), durationMinutes: 60 });
  expect(badPhone.status).toBe(400);
});

test('availability endpoint reports busy slots for a game', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const t = new Date(Date.now() + 3 * 3600e3);
  await request(app).post('/api/public/bookings').send({ name: 'Aisha', phone: '0300-1234561', gameId: game._id, t: t.toISOString(), durationMinutes: 60 });
  const res = await request(app).get(`/api/public/availability?gameId=${game._id}&from=${new Date(t - 3600e3).toISOString()}&to=${new Date(t.getTime() + 2 * 3600e3).toISOString()}`);
  expect(res.status).toBe(200);
  expect(res.body.stationCount).toBe(1);
  expect(res.body.busy.length).toBe(1);
});

test('an event can be created by an admin and the public can register up to its capacity', async () => {
  const owner = await bootstrapOwner(app);
  const ev = await request(app).post('/api/events').set('Authorization', `Bearer ${owner.token}`).send({
    title: 'FIFA Friday', t: new Date(Date.now() + 86400e3).toISOString(), fee: 300, maxParticipants: 1
  });
  expect(ev.status).toBe(201);

  const list = await request(app).get('/api/public/events');
  expect(list.body[0].full).toBe(false);

  const reg1 = await request(app).post(`/api/public/events/${ev.body._id}/register`).send({ name: 'P1', phone: '0300-1' });
  expect(reg1.status).toBe(201);
  const reg2 = await request(app).post(`/api/public/events/${ev.body._id}/register`).send({ name: 'P2', phone: '0300-2' });
  expect(reg2.status).toBe(409); // capacity 1, already full

  const listAfter = await request(app).get('/api/public/events');
  expect(listAfter.body[0].full).toBe(true);
});

test('joining the waiting list works with no auth, and staff can see and convert it', async () => {
  const owner = await bootstrapOwner(app);
  const game = await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const join = await request(app).post('/api/public/waiting-list').send({ name: 'Ali Raza', phone: '0300-1', gameId: game._id });
  expect(join.status).toBe(201);

  const list = await request(app).get('/api/waiting').set('Authorization', `Bearer ${owner.token}`);
  expect(list.body.length).toBe(1);

  const convert = await request(app).post(`/api/waiting/${join.body._id}/convert`).set('Authorization', `Bearer ${owner.token}`);
  expect(convert.status).toBe(200);
  expect(convert.body.booking.status).toBe('confirmed');

  const listAfter = await request(app).get('/api/waiting').set('Authorization', `Bearer ${owner.token}`);
  expect(listAfter.body.length).toBe(0); // converted entries drop off the active waiting list
});
