'use strict';
const { FakeCollection } = require('./fakeCollection');

const NAMES = [
  'Counter', 'Staff', 'Customer', 'BusinessSettings', 'Game', 'Station', 'PricingPackage',
  'Session', 'Booking', 'WaitingList', 'Payment', 'DiscountCode', 'Expense',
  'InventoryItem', 'InventoryTransaction', 'Event', 'EventRegistration'
];

let instance = null;

/* Mirrors each real schema's `default:` values (see src/models/*.js) — the
   fake ODM has no schema to read these from at create-time, so they're
   declared once here instead. Keep in sync if a model's defaults change. */
const DEFAULTS = {
  Staff: { role: 'Staff', active: true, name: '' },
  Customer: { sessions: 0, paid: 0, due: 0, phone: '', email: null },
  BusinessSettings: { name: 'GameBreak', address: '', phone: '', email: '', logoUrl: '', currency: 'PKR', taxPercent: 0, open: 10, close: 26, bookingLeadMinutes: 15 },
  Game: { icon: '🎮', description: '', active: true },
  Station: { status: 'available' },
  PricingPackage: { dayType: 'all', label: '', durationMinutes: null, active: true },
  Session: { customerId: null, customerName: '', bookingId: null, pkIndex: null, minutes: 0, gameAmount: 0, gameDiscount: 0, codeDiscount: 0, discountCode: '', extras: [], extrasAmount: 0, total: 0, paymentMethod: null, end: null },
  Booking: { email: '', discountCode: '', pay: 'Unpaid', status: 'pending', source: 'staff', customerId: null, stationId: null },
  WaitingList: { phone: '', notes: '', status: 'waiting', notifiedAt: null, bookingId: null },
  Payment: { sessionId: null, customerId: null, note: '' },
  DiscountCode: { desc: '', from: '', to: '', timeFrom: '', timeTo: '', games: [], durations: [], maxUses: 0, used: 0, active: true },
  Expense: { category: 'Other' },
  InventoryItem: { icon: '📦', category: 'Snacks', sellable: true, price: 0, lowStockThreshold: 5, unit: 'piece', stock: 0 },
  InventoryTransaction: { sessionId: null },
  Event: { kind: 'tournament', description: '', fee: 0, maxParticipants: 0, starred: false },
  EventRegistration: { customerId: null, email: '', paid: false },
  Counter: { seq: 0 }
};

function buildFakeModels() {
  const collections = {};
  NAMES.forEach(n => { collections[n] = new FakeCollection(n, DEFAULTS[n] || {}); });
  // These two use a custom String _id by real schema design (Counter's key,
  // BusinessSettings' fixed 'main' doc) rather than an auto ObjectId.
  collections.Counter.stringId = true;
  collections.BusinessSettings.stringId = true;
  collections.Station.STATUSES = ['available', 'running', 'reserved', 'maintenance'];
  collections.Booking.STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
  collections.Staff.ROLE_LEVEL = { Owner: 4, Admin: 3, Manager: 2, Staff: 1 };
  collections.Expense.CATEGORIES = ['Electricity', 'Internet', 'Rent', 'Equipment', 'Maintenance', 'Staff', 'Supplies', 'Other'];
  return collections;
}

/** Same instance every time it's called within one Jest module registry, so
 *  the "../models" mock and the "../models/Xyz" submodule mocks all share
 *  state — exactly like one real MongoDB connection would. */
function getInstance() {
  if (!instance) instance = buildFakeModels();
  return instance;
}
function resetInstance() { NAMES.forEach(n => getInstance()[n].reset()); }

module.exports = { getInstance, resetInstance, NAMES };
