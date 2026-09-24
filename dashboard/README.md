# GameBreak — Admin Dashboard

The private application staff and owners use to run the counter: live
sessions, customers, bookings, pricing, revenue, and everything else. A
completely separate application from `../frontend` — a customer can never
reach this by guessing a URL, because it isn't part of the public site's
code at all.

**Full setup and deployment instructions live in the
[root README](../README.md)** — this file is just a quick reference.

## Quick start

```
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev             # http://localhost:5174
```

The very first time you open it, with no staff accounts created yet, you'll
see a "Create the first owner account" form instead of a login form — that's
expected, and it's how the Owner account is created (see the root README,
Part 8).

## Roles

Staff → Manager → Admin → Owner, each including everything the one before it
can do. See the root README, Part 20, for exactly what each role can reach.
Every permission is enforced by the backend on every request; the sidebar
here just hides links a signed-in role can't use.
