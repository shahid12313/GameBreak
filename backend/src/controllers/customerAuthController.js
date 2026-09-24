'use strict';
const bcrypt = require('bcryptjs');
const { Customer } = require('../models');
const { sign } = require('../middleware/customerAuth');
const { httpError } = require('../middleware/errorHandler');

const validEmail = e => typeof e === 'string' && /^\S+@\S+\.\S+$/.test(e);

exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !String(name).trim()) throw httpError(400, 'Enter your name.');
  if (!validEmail(email)) throw httpError(400, 'Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 6) throw httpError(400, 'Password must be at least 6 characters.');
  const existing = await Customer.findOne({ email: String(email).toLowerCase().trim() });
  if (existing && existing.passwordHash) throw httpError(409, 'An account with that email already exists.');
  const passwordHash = await bcrypt.hash(password, 10);
  let customer;
  if (existing) { // a walk-in record with this email but no password yet — turn it into a real account
    existing.passwordHash = passwordHash;
    existing.name = String(name).trim();
    if (phone) existing.phone = String(phone).trim();
    customer = await existing.save();
  } else {
    customer = await Customer.create({ name: String(name).trim(), email: email.toLowerCase().trim(), phone: (phone || '').trim(), passwordHash });
  }
  res.status(201).json({ token: sign(customer), user: { name: customer.name, email: customer.email } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string') throw httpError(400, 'Enter your email and password.');
  const customer = await Customer.findOne({ email: String(email).toLowerCase().trim() });
  if (!customer || !customer.passwordHash || !(await bcrypt.compare(password, customer.passwordHash))) {
    throw httpError(401, 'Wrong email or password.');
  }
  res.json({ token: sign(customer), user: { name: customer.name, email: customer.email } });
};

exports.me = async (req, res) => {
  const customer = await Customer.findById(req.customer.sub);
  if (!customer) throw httpError(401, 'Account not found.');
  res.json({ user: { name: customer.name, email: customer.email, phone: customer.phone } });
};
