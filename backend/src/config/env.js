'use strict';
require('dotenv').config();

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter(k => !process.env[k]);
if (missing.length && process.env.NODE_ENV !== 'test') {
  // Fail loudly and early rather than starting a server that can't actually work.
  console.error(`Missing required environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development',
  /* Comma-separated list, e.g. "https://example.com,https://admin.example.com".
     Never falls back to "*" once this is set, per the security requirement that
     production CORS must be an explicit allow-list, not a wildcard. */
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',').map(s => s.trim()).filter(Boolean)
};
