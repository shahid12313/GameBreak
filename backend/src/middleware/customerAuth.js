'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function sign(customer) {
  return jwt.sign({ sub: String(customer._id), email: customer.email, kind: 'customer' }, env.jwtSecret, { expiresIn: '30d' });
}

/** Requires a valid customer token. Attaches req.customer = {sub, email}. */
function requireCustomer(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'Please sign in.' });
  try {
    const p = jwt.verify(m[1], env.jwtSecret);
    if (p.kind !== 'customer') return res.status(401).json({ error: 'Please sign in as a customer.' });
    req.customer = p;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

/** Like requireCustomer, but never fails — req.customer is set if a valid
 *  token was sent, otherwise left undefined. Used on public routes (like
 *  booking) that behave slightly differently for a signed-in customer. */
function optionalCustomer(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (m) { try { const p = jwt.verify(m[1], env.jwtSecret); if (p.kind === 'customer') req.customer = p; } catch (e) { /* ignore */ } }
  next();
}

module.exports = { sign, requireCustomer, optionalCustomer };
