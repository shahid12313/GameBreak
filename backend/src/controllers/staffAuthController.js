'use strict';
const bcrypt = require('bcryptjs');
const { Staff } = require('../models');
const { sign } = require('../middleware/staffAuth');
const { httpError } = require('../middleware/errorHandler');

const validEmail = e => typeof e === 'string' && /^\S+@\S+\.\S+$/.test(e);

/* Only works while the Staff collection is empty. This is how the very
   first account — the Owner — gets created, with no manual DB step. */
exports.bootstrap = async (req, res) => {
  const count = await Staff.estimatedDocumentCount();
  if (count > 0) throw httpError(409, 'Setup is already complete. Please sign in.');
  const { name, email, password } = req.body || {};
  if (!validEmail(email)) throw httpError(400, 'Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 6) throw httpError(400, 'Password must be at least 6 characters.');
  const passwordHash = await bcrypt.hash(password, 10);
  const staff = await Staff.create({ name: (name || '').trim(), email: email.toLowerCase().trim(), passwordHash, role: 'Owner', active: true });
  res.status(201).json({ token: sign(staff), user: { name: staff.name, email: staff.email, role: staff.role } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string') throw httpError(400, 'Enter your email and password.');
  const staff = await Staff.findOne({ email: String(email).toLowerCase().trim() });
  if (!staff || !staff.active || !(await bcrypt.compare(password, staff.passwordHash))) {
    throw httpError(401, 'Wrong email or password.');
  }
  res.json({ token: sign(staff), user: { name: staff.name, email: staff.email, role: staff.role } });
};

exports.me = async (req, res) => {
  const staff = await Staff.findById(req.staff.sub);
  if (!staff || !staff.active) throw httpError(401, 'Your account is no longer active.');
  res.json({ user: { name: staff.name, email: staff.email, role: staff.role } });
};

exports.status = async (req, res) => {
  const count = await Staff.estimatedDocumentCount();
  res.json({ needsBootstrap: count === 0 });
};
