# GameBreak — Backend

The Express + MongoDB API used by both `../frontend` and `../dashboard`.

**Full setup, environment variables, and deployment instructions live in the
[root README](../README.md)** — this file is just a quick reference once
you've already read that.

## Quick start

```
npm install
cp .env.example .env   # then fill in MONGO_URI and JWT_SECRET
npm run dev             # http://localhost:5000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-restart on file changes |
| `npm start` | Start the API (production) |
| `npm run seed` | Create default games/stations/prices, if none exist |
| `npm run seed:demo` | Also add sample customers, bookings, and history |
| `npm test` | Run the automated test suite (in-memory DB, no setup needed) |

## Folder guide

- `src/models/` — one Mongoose schema per file
- `src/controllers/` — the actual logic for each resource
- `src/routes/` — thin Express routers that wire URLs to controllers
- `src/middleware/` — `staffAuth.js` and `customerAuth.js` (JWT + roles),
  `errorHandler.js`
- `src/utils/billing.js` — the session pricing/proration math, in one place
  and unit-testable on its own
- `src/seed.js` — the two seed scripts above
- `tests/` — the automated test suite, plus an in-memory fake of the
  database layer used to run it without a real MongoDB connection
