'use strict';
const request = require('supertest');

async function bootstrapOwner(app, email = 'owner@test.com') {
  const res = await request(app).post('/api/auth/bootstrap').send({ name: 'Owner', email, password: 'secret123' });
  return { token: res.body.token, user: res.body.user };
}

async function addStaff(app, ownerToken, { email, role, password = 'secret123' }) {
  const res = await request(app).post('/api/staff').set('Authorization', `Bearer ${ownerToken}`).send({ email, password, role, name: role });
  const login = await request(app).post('/api/auth/login').send({ email, password });
  return { token: login.body.token, user: login.body.user, id: res.body._id };
}

/** Creates a game (via POST /api/games) then sets it to a simple linear
 *  hourly-equivalent session pricing (30/60/120/180 min at price/60 per
 *  minute), matching what the seed script does for real games. */
async function makeGame(app, adminToken, { name = 'PS5', icon = '🎮', pricePerHour = 500 } = {}) {
  const g = await request(app).post('/api/games').set('Authorization', `Bearer ${adminToken}`).send({ name, icon });
  const gameId = g.body._id;
  const pkg = async (kind, dayType, label, durationMinutes, price) =>
    request(app).post('/api/pricing').set('Authorization', `Bearer ${adminToken}`).send({ gameId, kind, dayType, label, durationMinutes, price });
  await pkg('session', 'all', '30 mins', 30, Math.round(pricePerHour / 2));
  await pkg('session', 'all', '1 Hour', 60, pricePerHour);
  await pkg('session', 'all', '2 Hours', 120, pricePerHour * 2);
  return g.body;
}

module.exports = { bootstrapOwner, addStaff, makeGame };
