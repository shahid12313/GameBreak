# GameBreak — Public Website

The customer-facing site: browse games, see pricing, book a session, create
an account, and track "My Bookings". Talks only to the backend's API —
never to MongoDB directly.

**Full setup and deployment instructions live in the
[root README](../README.md)** — this file is just a quick reference.

## Quick start

```
npm install
cp .env.example .env   # set VITE_API_URL (and VITE_DASHBOARD_URL)
npm run dev             # http://localhost:5173
```

## Environment variables

- `VITE_API_URL` — the backend's base URL, including `/api`
- `VITE_DASHBOARD_URL` — where the "Admin" button in the nav links to (the
  dashboard is a separate deployed application, not a route in this app)

Both are baked in at build time — change one and run `npm run build` again.

## Pages

Home, Games, Stations, Pricing, Book a Session, Events, About, Contact,
Sign in / Create account, My Account, My Bookings.
