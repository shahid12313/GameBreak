'use strict';
const request = require('supertest');
const { resetInstance, getInstance } = require('./support/mockModels');
const { bootstrapOwner, addStaff, makeGame } = require('./support/helpers');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

async function startSession(app, token, stationId, extra = {}) {
  return request(app).post('/api/sessions/start').set('Authorization', `Bearer ${token}`).send({ stationId, ...extra });
}

/* Rewrites a session's start time to "exactly K minutes billed" with a
   30-second safety margin before the next minute boundary, so the ceil()
   in the billing math gives a deterministic result regardless of the
   (milliseconds to low seconds) of real wall-clock time this test itself
   takes to run. See utils/billing.js — every *started* minute is billed. */
function backdateToBillKMinutes(sessionId, k) {
  const row = getInstance().Session.rows.find(r => r._id === sessionId);
  row.start = new Date(Date.now() - (k * 60 - 30) * 1000);
}

test('a station cannot start without any pricing set', async () => {
  const owner = await bootstrapOwner(app);
  await request(app).post('/api/games').set('Authorization', `Bearer ${owner.token}`).send({ name: 'No Price Game' });
  const games = await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`);
  const stationId = games.body.find(x => x.name === 'No Price Game').stations[0]._id;
  const res = await startSession(app, owner.token, stationId);
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/Pricing/i);
});

test('starting a session marks the station running, and a second start on the same station is rejected', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const games = await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`);
  const stationId = games.body[0].stations[0]._id;

  const started = await startSession(app, owner.token, stationId, { customerName: 'Ali', pkIndex: 1 });
  expect(started.status).toBe(201);

  const boardMid = await request(app).get('/api/sessions/board').set('Authorization', `Bearer ${owner.token}`);
  expect(boardMid.body.find(s => s._id === stationId).status).toBe('running');

  const again = await startSession(app, owner.token, stationId);
  expect(again.status).toBe(409);
});

test('THE CORE FIX: stopping a 1-Hour/500 package early bills proportionally, not the flat 500', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;

  const started = await startSession(app, owner.token, stationId, { customerName: 'Ali', pkIndex: 1 });
  const sessionId = started.body._id;
  backdateToBillKMinutes(sessionId, 20);

  const quote = await request(app).get(`/api/sessions/${sessionId}/quote`).set('Authorization', `Bearer ${owner.token}`);
  expect(quote.body.amount).toBe(167);

  const stopped = await request(app).post(`/api/sessions/${sessionId}/stop`).set('Authorization', `Bearer ${owner.token}`)
    .send({ paymentMethod: 'cash', extras: [] });
  expect(stopped.status).toBe(200);
  expect(stopped.body.total).toBe(167);
  expect(stopped.body.status).toBe('completed');

  const board = await request(app).get('/api/sessions/board').set('Authorization', `Bearer ${owner.token}`);
  expect(board.body.find(s => s._id === stationId).status).toBe('available');
});

test('stopping at exactly the full package time bills exactly the package price', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  const started = await startSession(app, owner.token, stationId, { pkIndex: 1 });
  backdateToBillKMinutes(started.body._id, 60);
  const stopped = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${owner.token}`).send({ paymentMethod: 'cash' });
  expect(stopped.body.total).toBe(500);
});

test('overtime still bills correctly (same formula, just past the package minutes)', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  const started = await startSession(app, owner.token, stationId, { pkIndex: 1 });
  backdateToBillKMinutes(started.body._id, 90);
  const stopped = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${owner.token}`).send({ paymentMethod: 'cash' });
  expect(stopped.body.total).toBe(750);
});

test('a discount code and canteen extras both apply correctly to the final bill, and stock/usage counters update', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  await request(app).post('/api/discounts').set('Authorization', `Bearer ${owner.token}`).send({ code: 'SAVE10', type: 'percent', value: 10 });
  const item = await request(app).post('/api/inventory').set('Authorization', `Bearer ${owner.token}`).send({ name: 'Cola', cost: 70, price: 100, stock: 10, sellable: true });

  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  const started = await startSession(app, owner.token, stationId, { pkIndex: 1 });
  backdateToBillKMinutes(started.body._id, 60);

  const stopped = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${owner.token}`)
    .send({ paymentMethod: 'cash', discountCode: 'save10', extras: [{ itemId: item.body._id, qty: 2 }] });
  expect(stopped.status).toBe(200);
  expect(stopped.body.gameDiscount).toBe(0);
  expect(stopped.body.codeDiscount).toBe(50);
  expect(stopped.body.extrasAmount).toBe(200);
  expect(stopped.body.total).toBe(650);

  const invAfter = await request(app).get('/api/inventory').set('Authorization', `Bearer ${owner.token}`);
  expect(invAfter.body.find(i => i._id === item.body._id).stock).toBe(8);

  const discAfter = await request(app).get('/api/discounts').set('Authorization', `Bearer ${owner.token}`);
  expect(discAfter.body.find(d => d.code === 'SAVE10').used).toBe(1);
});

test('an invalid discount code is rejected with a clear reason, and the session is left untouched (still running)', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  const started = await startSession(app, owner.token, stationId, { pkIndex: 1 });
  const res = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${owner.token}`)
    .send({ paymentMethod: 'cash', discountCode: 'NOPE' });
  expect(res.status).toBe(400);
  const board = await request(app).get('/api/sessions/board').set('Authorization', `Bearer ${owner.token}`);
  expect(board.body.find(s => s._id === stationId).status).toBe('running');
});

test('a code scoped to a different game is rejected for this game', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const pc = await makeGame(app, owner.token, { name: 'PC', pricePerHour: 400 });
  await request(app).post('/api/discounts').set('Authorization', `Bearer ${owner.token}`).send({ code: 'PCONLY', type: 'fixed', value: 50, games: [pc._id] });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body.find(g => g.name === 'PS5').stations[0]._id;
  const started = await startSession(app, owner.token, stationId, { pkIndex: 1 });
  const res = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${owner.token}`).send({ paymentMethod: 'cash', discountCode: 'PCONLY' });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/does not apply/i);
});

test('billing to a customer tab creates/updates the customer and adds to their due balance, never their paid total', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  const started = await startSession(app, owner.token, stationId, { customerName: 'Sana', pkIndex: 1 });
  backdateToBillKMinutes(started.body._id, 60);

  const stopped = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${owner.token}`)
    .send({ paymentMethod: 'tab' });
  expect(stopped.status).toBe(200);

  const customers = await request(app).get('/api/customers').set('Authorization', `Bearer ${owner.token}`);
  const sana = customers.body.find(c => c.name === 'Sana');
  expect(sana.due).toBe(500);
  expect(sana.paid).toBe(0);

  const settle = await request(app).post(`/api/customers/${sana._id}/settle`).set('Authorization', `Bearer ${owner.token}`);
  expect(settle.body.due).toBe(0);
  expect(settle.body.paid).toBe(500);
});

test('tab payment without any customer name is rejected', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  const started = await startSession(app, owner.token, stationId, { pkIndex: 1 });
  const res = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${owner.token}`).send({ paymentMethod: 'tab' });
  expect(res.status).toBe(400);
});

test('a per-minute (hourly) game bills correctly too', async () => {
  const owner = await bootstrapOwner(app);
  const g = await request(app).post('/api/games').set('Authorization', `Bearer ${owner.token}`).send({ name: 'PC Hourly' });
  await request(app).post('/api/pricing').set('Authorization', `Bearer ${owner.token}`).send({ gameId: g.body._id, kind: 'hourly', dayType: 'all', price: 600 }); // 10/min
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body.find(x => x.name === 'PC Hourly').stations[0]._id;
  const started = await startSession(app, owner.token, stationId);
  // Per-minute billing floors (not ceils) by default, unlike package billing —
  // so land just PAST the 12-minute mark, not just before it.
  getInstance().Session.rows.find(r => r._id === started.body._id).start = new Date(Date.now() - (12 * 60 + 5) * 1000);
  const stopped = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${owner.token}`).send({ paymentMethod: 'cash' });
  expect(stopped.body.total).toBe(120);
});

test('a Staff-role user can start and stop a session (base permission everyone has)', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const staff = await addStaff(app, owner.token, { email: 'till@test.com', role: 'Staff' });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  const started = await startSession(app, staff.token, stationId, { pkIndex: 0 });
  expect(started.status).toBe(201);
  const stopped = await request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${staff.token}`).send({ paymentMethod: 'cash' });
  expect(stopped.status).toBe(200);
});

test('stopping a session that does not exist (or is already billed) returns 404, not a crash', async () => {
  const owner = await bootstrapOwner(app);
  const res = await request(app).post('/api/sessions/aaaaaaaaaaaaaaaaaaaaaaaa/stop').set('Authorization', `Bearer ${owner.token}`).send({ paymentMethod: 'cash' });
  expect(res.status).toBe(404);
});
