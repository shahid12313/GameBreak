'use strict';
const bcrypt = require('bcryptjs');
const { Staff } = require('../models');
const { httpError } = require('../middleware/errorHandler');

exports.list = async (req, res) => res.json(await Staff.find().select('-passwordHash').sort({ createdAt: 1 }));

/* Only an Owner can add or edit staff accounts (see routes/staff.js) — that's
   the one thing the spec reserves above Admin. */
exports.create = async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, 'Enter a valid email.');
  if (!password || password.length < 6) throw httpError(400, 'Password must be at least 6 characters.');
  if (!['Owner', 'Admin', 'Manager', 'Staff'].includes(role)) throw httpError(400, 'Choose a role.');
  const passwordHash = await bcrypt.hash(password, 10);
  const staff = await Staff.create({ name: (name || '').trim(), email: email.toLowerCase().trim(), passwordHash, role, active: true });
  res.status(201).json({ _id: staff._id, name: staff.name, email: staff.email, role: staff.role, active: staff.active });
};

exports.update = async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw httpError(404, 'Not found.');
  if (String(staff._id) === req.staff.sub) throw httpError(400, "You can't change your own account here.");
  const { role, active } = req.body || {};
  if (role !== undefined) { if (!['Owner', 'Admin', 'Manager', 'Staff'].includes(role)) throw httpError(400, 'Invalid role.'); staff.role = role; }
  if (active !== undefined) staff.active = !!active;
  await staff.save();
  res.json({ _id: staff._id, name: staff.name, email: staff.email, role: staff.role, active: staff.active });
};

exports.remove = async (req, res) => {
  if (req.params.id === req.staff.sub) throw httpError(400, "You can't remove your own account.");
  await Staff.findByIdAndDelete(req.params.id);
  res.status(204).end();
};

exports.resetPassword = async (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6) throw httpError(400, 'Password must be at least 6 characters.');
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw httpError(404, 'Not found.');
  staff.passwordHash = await bcrypt.hash(password, 10);
  await staff.save();
  res.json({ ok: true });
};
