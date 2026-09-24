'use strict';
/* Usage:
     npm run seed        -> creates default games/stations/pricing/settings
                             if (and only if) the database is empty
     npm run seed:demo   -> also adds sample customers/bookings/expenses/
                             history so every dashboard page has something
                             to show. Refuses to run if real session history
                             already exists, so it can never overwrite real
                             business data.
*/
require('dotenv').config();
const mongoose = require('mongoose');
const env = require('./config/env');
const { Game, Station, PricingPackage, BusinessSettings, Customer, Booking, Expense, Session, InventoryItem } = require('./models');
const { nextBookingRef } = require('./utils/bookingRef');

const DEMO = process.argv.includes('--demo');

const DEFAULT_GAMES = [
  { name: 'PS4 Pro', icon: '🎮', pricePerHour: 400 },
  { name: 'PS5', icon: '🎮', pricePerHour: 500 },
  { name: 'Driving Simulator', icon: '🏎️', pricePerHour: 400 },
  { name: 'PC', icon: '🖥️', pricePerHour: 400 }
];

async function ensureDefaults() {
  await BusinessSettings.findByIdAndUpdate('main', {}, { upsert: true, setDefaultsOnInsert: true });

  const existing = await Game.estimatedDocumentCount();
  if (existing > 0) {
    console.log('Games already exist — skipping default setup. (Nothing was changed.)');
    return;
  }
  for (const g of DEFAULT_GAMES) {
    const game = await Game.create({ name: g.name, icon: g.icon });
    await Station.create({ gameId: game._id, name: `${g.name} 1` });
    const p = g.pricePerHour;
    await PricingPackage.insertMany([
      { gameId: game._id, kind: 'session', dayType: 'all', label: '30 mins', durationMinutes: 30, price: Math.round(p / 2) },
      { gameId: game._id, kind: 'session', dayType: 'all', label: '1 Hour', durationMinutes: 60, price: p },
      { gameId: game._id, kind: 'session', dayType: 'all', label: '2 Hours', durationMinutes: 120, price: p * 2 },
      { gameId: game._id, kind: 'session', dayType: 'all', label: '3 Hours', durationMinutes: 180, price: p * 3 }
    ]);
    console.log(`Created ${g.name} (station + pricing).`);
  }
}

async function ensureDemoData() {
  const realHistory = await Session.estimatedDocumentCount();
  if (realHistory > 0) {
    console.log('Real session history already exists — refusing to add demo data.');
    return;
  }
  const games = await Game.find();
  if (!games.length) { console.log('Run without --demo first, or nothing to attach demo data to.'); return; }

  await InventoryItem.insertMany([
    { name: 'Cappuccino', icon: '☕', sellable: true, price: 250, cost: 120, stock: 20, unit: 'cup' },
    { name: 'Chicken Roll', icon: '🌯', sellable: true, price: 220, cost: 130, stock: 25, unit: 'piece' },
    { name: 'Pepsi Can', icon: '🥤', sellable: true, price: 100, cost: 70, stock: 40, unit: 'can' },
    { name: 'Tissue Roll', icon: '🧻', sellable: false, cost: 100, stock: 20, unit: 'roll' }
  ]);

  const customers = await Customer.insertMany([
    { name: 'Hamza Sheikh', phone: '0300-1000001', sessions: 1, paid: 0, due: 400 },
    { name: 'Ayesha Farooq', phone: '0300-1000002', sessions: 3, paid: 1200, due: 0 },
    { name: 'Bilal Khan', phone: '0300-1000003', sessions: 2, paid: 800, due: 0 }
  ]);

  for (let i = 0; i < 6; i++) {
    const g = games[i % games.length];
    await Booking.create({
      ref: await nextBookingRef(), customerId: customers[i % customers.length]._id,
      name: customers[i % customers.length].name, phone: customers[i % customers.length].phone,
      gameId: g._id, gameName: g.name, t: new Date(Date.now() + (i + 1) * 3600e3), durationMinutes: 60,
      price: 500, status: i % 3 === 0 ? 'pending' : 'confirmed', source: i % 2 === 0 ? 'web' : 'staff'
    });
  }

  const now = Date.now();
  const rows = [];
  for (let d = 29; d >= 0; d--) {
    const day = new Date(now - d * 86400000); day.setHours(0, 0, 0, 0);
    const n = 3 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const g = games[Math.floor(Math.random() * games.length)];
      const start = new Date(day.getTime() + (10 + Math.random() * 12) * 3600e3);
      if (start.getTime() > now) continue;
      const minutes = [30, 60, 90, 120][Math.floor(Math.random() * 4)];
      const amount = Math.round(minutes * (500 / 60));
      rows.push({
        stationId: new mongoose.Types.ObjectId(), gameId: g._id, gameName: g.name, stationName: `${g.name} 1`,
        status: 'completed', start, end: new Date(start.getTime() + minutes * 60000), minutes,
        gameAmount: amount, extrasAmount: Math.random() < 0.3 ? 250 : 0, total: amount + (Math.random() < 0.3 ? 250 : 0),
        paymentMethod: ['cash', 'card', 'tab'][Math.floor(Math.random() * 3)]
      });
    }
  }
  if (rows.length) await Session.insertMany(rows);

  for (let m = 0; m < 2; m++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m);
    await Expense.create({ description: 'Monthly Rent', category: 'Rent', amount: 28000, date: new Date(d.getFullYear(), d.getMonth(), 2) });
    await Expense.create({ description: 'Electricity Bill', category: 'Electricity', amount: 6500, date: new Date(d.getFullYear(), d.getMonth(), 4) });
  }

  console.log(`Added demo data: ${customers.length} customers, 6 bookings, ${rows.length} historical sessions, expenses.`);
}

(async () => {
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected for seeding.');
  await ensureDefaults();
  if (DEMO) await ensureDemoData();
  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
