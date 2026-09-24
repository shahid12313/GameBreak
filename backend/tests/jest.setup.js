'use strict';
/* Runs once before the test framework loads any test file. Registers fake
   in-memory stand-ins for every path this codebase requires the real
   Mongoose models from (the index AND the few direct submodule imports),
   plus a no-op "mongoose" for the one place (session stop) that opens a
   real transaction — this sandbox has no network path to a real MongoDB,
   so this is how the real app/routes/controllers get exercised through
   genuine HTTP requests instead. See tests/support/fakeCollection.js.

   Each factory below calls require() fresh, inline, rather than closing
   over an outer variable — Jest's mock-hoisting only allows out-of-scope
   references named "mock*", so this side-steps that restriction while
   still returning the same cached singleton (see mockModels.getInstance). */
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://fake-for-tests';
process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-real-deployments';
process.env.CORS_ORIGINS = 'http://localhost:5173,http://localhost:5174,http://test.local';

jest.mock(require.resolve('../src/models'), () => require('./support/mockModels').getInstance());
jest.mock(require.resolve('../src/models/Staff'), () => require('./support/mockModels').getInstance().Staff);
jest.mock(require.resolve('../src/models/Station'), () => require('./support/mockModels').getInstance().Station);
jest.mock(require.resolve('../src/models/Booking'), () => require('./support/mockModels').getInstance().Booking);
jest.mock(require.resolve('../src/models/Expense'), () => require('./support/mockModels').getInstance().Expense);

jest.mock('mongoose', () => ({
  startSession: async () => ({ withTransaction: async fn => fn(), endSession() {} }),
  set: () => {}
}));
