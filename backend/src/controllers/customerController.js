'use strict';
const { Customer, Payment, Session, Booking } = require('../models');
const { httpError } = require('../middleware/errorHandler');

exports.list = async (req, res) => {
  const { q } = req.query;
  const filter = q ? { $or: [{ name: new RegExp(escapeRe(q), 'i') }, { phone: new RegExp(escapeRe(q), 'i') }, { email: new RegExp(escapeRe(q), 'i') }] } : {};
  res.json(await Customer.find(filter).sort({ name: 1 }).limit(500));
};
function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

exports.create = async (req, res) => {
  const { name, phone, email } = req.body || {};
  if (!name || !String(name).trim()) throw httpError(400, 'Enter a name.');
  res.status(201).json(await Customer.create({ name: String(name).trim(), phone: (phone || '').trim(), email: email ? String(email).toLowerCase().trim() : null }));
};

exports.update = async (req, res) => {
  const c = await Customer.findById(req.params.id);
  if (!c) throw httpError(404, 'Customer not found.');
  const { name, phone } = req.body || {};
  if (name !== undefined) c.name = String(name).trim();
  if (phone !== undefined) c.phone = String(phone).trim();
  await c.save();
  res.json(c);
};

exports.settle = async (req, res) => {
  const c = await Customer.findById(req.params.id);
  if (!c) throw httpError(404, 'Customer not found.');
  if (c.due <= 0) throw httpError(400, 'This customer has no balance due.');
  const amount = c.due;
  c.paid += amount; c.due = 0;
  await c.save();
  await Payment.create({ amount, method: 'tab-settled', customerId: c._id, at: new Date() });
  res.json(c);
};

exports.history = async (req, res) => {
  const c = await Customer.findById(req.params.id);
  if (!c) throw httpError(404, 'Customer not found.');
  const [sessions, bookings] = await Promise.all([
    Session.find({ customerId: c._id, status: 'completed' }).sort({ start: -1 }).limit(100),
    Booking.find({ customerId: c._id }).sort({ t: -1 }).limit(100)
  ]);
  res.json({ customer: c, sessions, bookings });
};
