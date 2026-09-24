'use strict';
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

/* Explicit allow-list only — never "*" — per the security requirement.
   CORS_ORIGINS in .env is a comma-separated list of the exact frontend
   and dashboard URLs allowed to call this API. */
app.use(cors({
  origin(origin, cb) {
    if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: false
}));

app.get('/api/health', (req, res) => res.json({ ok: true, env: env.nodeEnv }));

app.use('/api/auth', require('./routes/staffAuth'));
app.use('/api/customer-auth', require('./routes/customerAuth'));
app.use('/api/customer', require('./routes/customerBookings'));
app.use('/api/public', require('./routes/public'));

app.use('/api/games', require('./routes/games'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/waiting', require('./routes/waiting'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/revenue', require('./routes/revenue'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/events', require('./routes/events'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/settings', require('./routes/settings'));

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use(errorHandler);

module.exports = app;
