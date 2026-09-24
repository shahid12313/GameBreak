'use strict';
/* Runs the REAL app.js as a real listening HTTP server, backed by the same
   in-memory fake database used in the Jest suite — NOT for production, only
   so a real browser (via Playwright) can drive the real dashboard and
   frontend builds against real HTTP+CORS+JWT wiring in this sandbox, which
   has no network path to an actual MongoDB. Mirrors what jest.mock does,
   by hand, via Node's own module loader. */
const Module = require('module');
const { getInstance } = require('./support/mockModels');

const modelsIndexPath = require.resolve('../src/models');
const staffPath = require.resolve('../src/models/Staff');
const stationPath = require.resolve('../src/models/Station');
const bookingPath = require.resolve('../src/models/Booking');
const expensePath = require.resolve('../src/models/Expense');

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'mongoose' && parent && /sessionController/.test(parent.filename)) {
    return { startSession: async () => ({ withTransaction: async fn => fn(), endSession() {} }) };
  }
  if (['.', '/'].some(c => request.startsWith(c)) || request === '../models' || request.includes('models')) {
    try {
      const resolved = Module._resolveFilename(request, parent, isMain);
      if (resolved === modelsIndexPath) return getInstance();
      if (resolved === staffPath) return getInstance().Staff;
      if (resolved === stationPath) return getInstance().Station;
      if (resolved === bookingPath) return getInstance().Booking;
      if (resolved === expensePath) return getInstance().Expense;
    } catch (e) { /* fall through to normal loading */ }
  }
  return origLoad.apply(this, arguments);
};

process.env.JWT_SECRET = 'manual-browser-test-secret-not-for-real-use';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174';
process.env.MONGO_URI = 'mongodb://fake-for-manual-test';
const PORT = process.env.PORT || 5000;

const app = require('../src/app');
app.listen(PORT, () => console.log(`Manual test server (fake DB) listening on ${PORT}`));
