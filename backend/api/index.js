'use strict';
/* Vercel serverless entry point. Vercel calls this function per request
   instead of running src/server.js, so the MongoDB connection is opened
   once per warm instance and reused across requests. */
const mongoose = require('mongoose');
const env = require('../src/config/env');
const app = require('../src/app');

mongoose.set('strictQuery', true);

let connecting = null;
function connect() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose.connect(env.mongoUri).catch(err => {
      connecting = null; // allow the next request to retry
      throw err;
    });
  }
  return connecting;
}

module.exports = async (req, res) => {
  try {
    await connect();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return res.status(500).json({ error: 'Database unavailable.' });
  }
  return app(req, res);
};
