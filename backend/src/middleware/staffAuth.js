'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Staff = require('../models/Staff');
const { ROLE_LEVEL } = Staff;

function sign(staff) {
  return jwt.sign({ sub: String(staff._id), email: staff.email, role: staff.role, kind: 'staff' }, env.jwtSecret, { expiresIn: '30d' });
}

/** Requires a valid staff token for an account that is still active.
 *  Attaches req.staff = {sub, email, role}. The account is re-read on every
 *  request so a disabled account (or a changed role) takes effect at once,
 *  instead of only when the 30-day token expires. */
async function requireStaff(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'Please sign in.' });
  let p;
  try {
    p = jwt.verify(m[1], env.jwtSecret);
  } catch (e) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
  if (p.kind !== 'staff') return res.status(401).json({ error: 'Please sign in as staff.' });
  try {
    const staff = await Staff.findById(p.sub).lean();
    if (!staff || !staff.active) return res.status(401).json({ error: 'Your account is no longer active.' });
    req.staff = { ...p, email: staff.email, role: staff.role };
    next();
  } catch (e) {
    next(e);
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
