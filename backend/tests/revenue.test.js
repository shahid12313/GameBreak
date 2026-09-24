'use strict';
const request = require('supertest');
const ExcelJS = require('exceljs');
const { resetInstance, getInstance } = require('./support/mockModels');
const { bootstrapOwner, addStaff, makeGame } = require('./support/helpers');

let app;
beforeAll(() => { app = require('../src/app'); });
beforeEach(() => resetInstance());

async function billSession(app, ownerToken, stationId, pkIndex, minutesAgo, paymentMethod = 'cash') {
  const started = await request(app).post('/api/sessions/start').set('Authorization', `Bearer ${ownerToken}`).send({ stationId, pkIndex });
  getInstance().Session.rows.find(r => r._id === started.body._id).start = new Date(Date.now() - (minutesAgo * 60 - 5) * 1000);
  return request(app).post(`/api/sessions/${started.body._id}/stop`).set('Authorization', `Bearer ${ownerToken}`).send({ paymentMethod });
}

test('the dashboard KPI endpoint is reachable by Staff (not just Admin) and reflects today\'s activity', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  await billSession(app, owner.token, stationId, 1, 60); // full 1hr/500

  const staff = await addStaff(app, owner.token, { email: 'till@test.com', role: 'Staff' });
  const dash = await request(app).get('/api/revenue/dashboard').set('Authorization', `Bearer ${staff.token}`);
  expect(dash.status).toBe(200);
  expect(dash.body.todayRevenue).toBe(500);
  expect(dash.body.todaySessions).toBe(1);
  expect(dash.body.availableStations).toBe(1);
});

test('revenue summary totals match the sum of the sessions actually billed, and Staff cannot reach it', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  await billSession(app, owner.token, stationId, 1, 60, 'cash');  // 500
  await billSession(app, owner.token, stationId, 0, 30, 'card');  // 250 (30 min pkg)
  await request(app).post('/api/expenses').set('Authorization', `Bearer ${owner.token}`).send({ description: 'Rent', category: 'Rent', amount: 200, date: new Date().toISOString() });

  const staff = await addStaff(app, owner.token, { email: 'till@test.com', role: 'Staff' });
  const denied = await request(app).get('/api/revenue/summary').set('Authorization', `Bearer ${staff.token}`);
  expect(denied.status).toBe(403);

  const from = new Date(); from.setDate(1);
  const res = await request(app).get(`/api/revenue/summary?from=${from.toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`).set('Authorization', `Bearer ${owner.token}`);
  expect(res.status).toBe(200);
  expect(res.body.gameRevenue).toBe(750);
  expect(res.body.totalExpenses).toBe(200);
  expect(res.body.netRevenue).toBe(550);
  expect(res.body.sessionCount).toBe(2);
  expect(res.body.byPaymentMethod.find(p => p.method === 'cash').amount).toBe(500);
  expect(res.body.byPaymentMethod.find(p => p.method === 'card').amount).toBe(250);
});

test('the Excel export produces a real, valid, readable .xlsx workbook with the right numbers in it', async () => {
  const owner = await bootstrapOwner(app);
  await makeGame(app, owner.token, { name: 'PS5', pricePerHour: 500 });
  const stationId = (await request(app).get('/api/games').set('Authorization', `Bearer ${owner.token}`)).body[0].stations[0]._id;
  await billSession(app, owner.token, stationId, 1, 60, 'cash');

  const from = new Date(); from.setDate(1);
  const res = await request(app).get(`/api/revenue/export?from=${from.toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`)
    .set('Authorization', `Bearer ${owner.token}`).buffer(true).parse((response, cb) => {
      const chunks = []; response.on('data', c => chunks.push(c)); response.on('end', () => cb(null, Buffer.concat(chunks)));
    });
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toMatch(/spreadsheetml/);
  expect(res.headers['content-disposition']).toMatch(/attachment.*\.xlsx/);

  // Prove it's a real, parseable workbook — not just bytes with the right Content-Type.
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(res.body);
  const sheetNames = wb.worksheets.map(w => w.name);
  expect(sheetNames).toEqual(expect.arrayContaining(['Summary', 'By Game', 'Sessions', 'Expenses']));

  const summary = wb.getWorksheet('Summary');
  const totalRevenueRow = summary.getRows(1, summary.rowCount).find(r => r.getCell(1).value === 'Total revenue');
  expect(totalRevenueRow.getCell(2).value).toBe(500);

  const sessions = wb.getWorksheet('Sessions');
  expect(sessions.getRow(2).getCell(3).value).toBe('PS5'); // Game column
  expect(sessions.getRow(2).getCell(9).value).toBe(500);   // Total column
});

test('an Admin (not just Owner) can also export revenue', async () => {
  const owner = await bootstrapOwner(app);
  const admin = await addStaff(app, owner.token, { email: 'admin@test.com', role: 'Admin' });
  const res = await request(app).get('/api/revenue/export').set('Authorization', `Bearer ${admin.token}`);
  expect(res.status).toBe(200);
});
