'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ROLE_LEVEL } = require('../models/Staff');

function sign(staff) {
  return jwt.sign({ sub: String(staff._id), email: staff.email, role: staff.role, kind: 'staff' }, env.jwtSecret, { expiresIn: '30d' });
}

/** Requires a valid staff token. Attaches req.staff = {sub, email, role}. */
function requireStaff(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'Please sign in.' });
  try {
    const p = jwt.verify(m[1], env.jwtSecret);
    if (p.kind !== 'staff') return res.status(401).json({ error: 'Please sign in as staff.' });
    req.staff = p;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

/** requireRole('Manager') lets Manager, Admin and Owner through; blocks Staff. */
function requireRole(minRole) {
  const minLevel = ROLE_LEVEL[minRole];
  return (req, res, next) => {
    const level = ROLE_LEVEL[req.staff && req.staff.role];
    if (!level || level < minLevel) return res.status(403).json({ error: `This needs ${minRole} access or higher.` });
    next();
  };
}

module.exports = { sign, requireStaff, requireRole };
